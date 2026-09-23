"use client";

// Наставник идёт за игроком во время тура (рендерится в <Canvas> через city/extras.ts).
// Появляется и исчезает в столбе света с искрами; в туре под ним золотое кольцо, над головой
// маркер и тёплый свет. Без постпроцессинга: additive-материалы и один pointLight.

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CanvasTexture, DoubleSide, SRGBColorSpace, type Group, type Mesh, type MeshBasicMaterial, type PointLight, type Points } from "three";
import { Character, type CharacterAction } from "@/features/city/Character";
import { playerPosition } from "@/features/city/playerState";
import { useScene } from "@/features/city/sceneState";
import { getState } from "@/lib/client-store";
import { PLACES } from "@/lib/world";
import { getTour, tourActions, useTour } from "./tour";

const KEEP = 1.5;
const BODY = 0.4;
const APPEAR_S = 1;
const VANISH_S = 1.1;
const BURST_S = 1.1;
const CHEER_MS = 1700;
const GOLD = "#ffd27a";

/** общий с GuideLight: где наставник и насколько он светится */
const glow = { x: 0, z: 0, value: 0 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const C1 = 1.70158;
const C3 = C1 + 1;
const easeOutBack = (x: number) => 1 + C3 * (x - 1) ** 3 + C1 * (x - 1) ** 2;
const easeInBack = (x: number) => C3 * x ** 3 - C1 * x ** 2;

function angleLerp(from: number, to: number, t: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * t;
}

let textures: { ring: CanvasTexture; beam: CanvasTexture } | null = null;
/** мягкие градиенты вместо bloom: кольцо под ногами и столб света */
function glowTextures() {
  if (textures) return textures;
  const ringCanvas = document.createElement("canvas");
  ringCanvas.width = ringCanvas.height = 128;
  const rc = ringCanvas.getContext("2d")!;
  const rg = rc.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, "rgba(255,214,130,0.3)");
  rg.addColorStop(0.5, "rgba(255,214,130,0.12)");
  rg.addColorStop(0.72, "rgba(255,224,150,1)");
  rg.addColorStop(0.86, "rgba(255,200,110,0.3)");
  rg.addColorStop(1, "rgba(255,200,110,0)");
  rc.fillStyle = rg;
  rc.fillRect(0, 0, 128, 128);

  const beamCanvas = document.createElement("canvas");
  beamCanvas.width = 4;
  beamCanvas.height = 128;
  const bc = beamCanvas.getContext("2d")!;
  const bg = bc.createLinearGradient(0, 0, 0, 128);
  bg.addColorStop(0, "rgba(255,236,180,0)");
  bg.addColorStop(0.55, "rgba(255,236,180,0.45)");
  bg.addColorStop(0.92, "rgba(255,228,160,1)");
  bg.addColorStop(1, "rgba(255,228,160,0.4)");
  bc.fillStyle = bg;
  bc.fillRect(0, 0, 4, 128);

  const ring = new CanvasTexture(ringCanvas);
  const beam = new CanvasTexture(beamCanvas);
  ring.colorSpace = beam.colorSpace = SRGBColorSpace;
  textures = { ring, beam };
  return textures;
}

/** вспышка искр: разлетаются и оседают, потом исчезают */
function Burst() {
  const group = useRef<Group>(null);
  const points = useRef<Points>(null);
  const [t0] = useState(() => performance.now());
  const [done, setDone] = useState(false);
  useFrame(() => {
    const p = clamp01((performance.now() - t0) / 1000 / BURST_S);
    if (p >= 1) {
      if (!done) setDone(true);
      return;
    }
    const g = group.current;
    if (g) {
      g.position.y = 1.1 - p * 0.9;
      g.scale.set(1 + p * 0.5, 1 - p * 0.6, 1 + p * 0.5);
    }
    const a = points.current?.geometry.getAttribute("opacity");
    if (a) {
      const v = (1 - p) ** 2;
      for (let i = 0; i < a.count; i++) a.setX(i, v);
      a.needsUpdate = true;
    }
  });
  if (done) return null;
  return (
    <group ref={group} position={[0, 1.1, 0]}>
      <Sparkles ref={points} count={36} scale={[1.8, 2.2, 1.8]} size={6} speed={1.4} noise={2} color={GOLD} />
    </group>
  );
}

type Phase = "appear" | "on" | "vanish";

function Follower() {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const beam = useRef<Mesh>(null);
  const marker = useRef<Mesh>(null);
  const action = useRef<CharacterAction>("idle");
  const m = useRef({ seq: -1, x: 0, z: 0, yaw: 0, phase: "appear" as Phase, t0: 0, cheerUntil: 0, wait: 0 });
  const [burst, setBurst] = useState(0);
  const tex = useMemo(() => glowTextures(), []);

  useEffect(() => () => {
    glow.value = 0;
  }, []);

  useFrame((_, rawDelta) => {
    const g = root.current;
    const b = body.current;
    if (!g || !b) return;
    const dt = Math.min(rawDelta, 0.05);
    const s = m.current;
    const tour = getTour();
    const now = performance.now();
    const px = playerPosition.x;
    const pz = playerPosition.z;

    // Появление: чуть впереди-справа от игрока, лицом к нему, с приветствием.
    if (s.seq !== tour.seq) {
      s.seq = tour.seq;
      // тур закрыли, пока игрок был в здании: показывать нечего
      if (tour.leaving) {
        tourActions.gone();
        return;
      }
      s.x = px + 1.0;
      s.z = pz + 1.0;
      s.yaw = Math.atan2(px - s.x, pz - s.z);
      s.phase = "appear";
      s.t0 = now;
      s.cheerUntil = now + CHEER_MS;
      action.current = "cheer";
      setBurst((k) => k + 1);
    }
    if (tour.leaving && s.phase !== "vanish") {
      s.phase = "vanish";
      s.t0 = now;
      s.cheerUntil = 0;
      action.current = "idle";
      setBurst((k) => k + 1);
    }

    const t = (now - s.t0) / 1000;
    let scale = 1;
    let beamOpacity = 0;
    let beamWidth = 1;
    let flash = 0;
    if (s.phase === "appear") {
      const p = clamp01(t / APPEAR_S);
      scale = easeOutBack(clamp01((t - 0.12) / 0.6));
      beamOpacity = 0.6 * (1 - p) ** 1.6;
      beamWidth = 0.35 + 0.65 * (1 - p);
      flash = 1.5 * (1 - p);
      if (p >= 1) s.phase = "on";
    } else if (s.phase === "vanish") {
      const p = clamp01(t / VANISH_S);
      scale = Math.max(0, 1 - easeInBack(clamp01((t - 0.15) / 0.6)));
      beamOpacity = 0.6 * (p < 0.25 ? p / 0.25 : (1 - (p - 0.25) / 0.75) ** 1.5);
      beamWidth = 1 - 0.6 * p;
      flash = 1.2 * Math.sin(Math.PI * p);
      if (p >= 1) {
        glow.value = 0;
        tourActions.gone();
        return;
      }
    }

    // Следование за игроком (кроме ухода).
    const dx = px - s.x;
    const dz = pz - s.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;
    if (s.phase !== "vanish") {
      if (dist > 16) {
        s.x = px - (dx / dist) * KEEP;
        s.z = pz - (dz / dist) * KEEP;
      } else if (dist > KEEP) {
        const speed = Math.min(8, (dist - KEEP) * 3 + 1.5);
        const step = Math.min(speed * dt, dist - KEEP);
        s.x += (dx / dist) * step;
        s.z += (dz / dist) * step;
        s.yaw = angleLerp(s.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 10));
        moving = step > 0.002;
        if (moving) s.cheerUntil = 0;
        action.current = moving ? (speed > 5 ? "run" : "walk") : action.current;
      }
      if (!moving) {
        if (!s.cheerUntil || now > s.cheerUntil) action.current = "idle";
        s.yaw = angleLerp(s.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 4));
      }
      for (const p of PLACES) {
        const ox = s.x - p.position[0];
        const oz = s.z - p.position[1];
        const d = Math.hypot(ox, oz);
        const min = p.radius + BODY;
        if (d > 0 && d < min) {
          s.x = p.position[0] + (ox / d) * min;
          s.z = p.position[1] + (oz / d) * min;
        }
      }
    }

    // Ждёт реплику: карточка открыта, игрок стоит рядом — пульс заметнее.
    const waiting = tour.active && !getState().moveTarget && dist <= KEEP + 0.4;
    s.wait += ((waiting ? 1 : 0) - s.wait) * (1 - Math.exp(-dt * 4));
    const time = now / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(time * (2 + 2.5 * s.wait));

    g.position.set(s.x, 0, s.z);
    b.rotation.y = s.yaw;
    b.scale.setScalar(Math.max(0.001, scale));

    const r = ring.current;
    if (r) {
      const k = Math.max(0, scale) * (1 + (0.04 + 0.12 * s.wait) * pulse);
      r.scale.set(k, k, 1);
      (r.material as MeshBasicMaterial).opacity = clamp01(scale) * (0.45 + (0.15 + 0.3 * s.wait) * pulse);
    }
    const bm = beam.current;
    if (bm) {
      bm.visible = beamOpacity > 0.01;
      bm.scale.set(beamWidth, 1, beamWidth);
      (bm.material as MeshBasicMaterial).opacity = beamOpacity;
    }
    const mk = marker.current;
    if (mk) {
      mk.position.y = 2.3 + Math.sin(time * 2.2) * (0.05 + 0.07 * s.wait);
      mk.rotation.y = time * 1.6;
      mk.scale.setScalar(Math.max(0.001, scale * (1 + 0.28 * s.wait * pulse)));
    }

    glow.x = s.x;
    glow.z = s.z;
    glow.value = clamp01(scale) * (1 + 0.35 * s.wait * pulse) + flash;
  });

  return (
    <group ref={root}>
      <group ref={body} scale={0.001}>
        <Character model="mage" actionRef={action} />
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} renderOrder={1}>
        <planeGeometry args={[1.9, 1.9]} />
        <meshBasicMaterial map={tex.ring} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={beam} position={[0, 5, 0]} visible={false} renderOrder={2}>
        <cylinderGeometry args={[0.55, 0.8, 10, 24, 1, true]} />
        <meshBasicMaterial map={tex.beam} color="#ffc873" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh ref={marker} position={[0, 2.3, 0]} scale={0.001}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffb020" emissiveIntensity={1.4} flatShading />
      </mesh>
      {burst > 0 && <Burst key={burst} />}
    </group>
  );
}

/** свет всегда в сцене (интенсивность 0 без наставника): иначе смена числа ламп перекомпилирует шейдеры */
function GuideLight() {
  const light = useRef<PointLight>(null);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    l.intensity = glow.value * 12;
    l.position.set(glow.x, 2.8, glow.z + 0.3);
  });
  return <pointLight ref={light} intensity={0} distance={6} decay={2} color="#ffc766" />;
}

export function MentorGuide() {
  const shown = useTour((s) => s.active || s.leaving);
  const street = useScene((s) => s.mode === "street");
  return (
    <>
      <GuideLight />
      {shown && street && <Follower />}
    </>
  );
}
