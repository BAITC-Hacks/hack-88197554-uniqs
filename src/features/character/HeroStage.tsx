"use client";

// 3D-превью героя в листе персонажа: подиум, крутится мышью, idle / cheer / interact.
// Своя копия GLB (SkeletonUtils через prepareClone): реквизит показываем по надетой экипировке,
// персонажи в городе не меняются.

import { ContactShadows, Sparkles, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { LoopOnce, LoopRepeat, type AnimationAction, type Group, type Object3D } from "three";
import { CHARACTERS, prepareClone, type CharacterId } from "@/features/city/models";
import { gearNodes } from "./gear";

export type HeroGesture = { clip: "Cheer" | "Interact"; seq: number } | null;

type Actions = Record<string, AnimationAction | null>;

/** переключить клип с кроссфейдом; вне компонента, чтобы не мутировать значения рендера */
function play(current: { action: AnimationAction | null }, actions: Actions, clip: string, once: boolean) {
  const next = actions[clip];
  if (!next) return;
  if (current.action === next && !once) return;
  next.reset();
  next.setLoop(once ? LoopOnce : LoopRepeat, Infinity);
  next.clampWhenFinished = once;
  next.enabled = true;
  if (current.action && current.action !== next) next.crossFadeFrom(current.action, 0.25, true);
  next.play();
  current.action = next;
}

function applyGear(object: Object3D, all: string[], visible: string[]) {
  for (const name of all) {
    const node = object.getObjectByName(name);
    if (node) node.visible = visible.includes(name);
  }
}

function HeroModel({ hero, nodes, gesture }: { hero: CharacterId; nodes: string[]; gesture: HeroGesture }) {
  const { scene, animations } = useGLTF(CHARACTERS[hero]);
  const object = useMemo(() => prepareClone(scene), [scene]);
  const all = useMemo(() => gearNodes(hero), [hero]);
  const group = useRef<Group>(null);
  const { actions, mixer } = useAnimations(animations, group);
  const current = useRef<{ action: AnimationAction | null }>({ action: null });

  useLayoutEffect(() => applyGear(object, all, nodes), [object, all, nodes]);

  useEffect(() => {
    play(current.current, actions, gesture ? gesture.clip : "Idle", !!gesture);
  }, [actions, gesture]);

  useEffect(() => {
    const onDone = (e: { action: AnimationAction }) => {
      if (e.action !== actions.Idle) play(current.current, actions, "Idle", false);
    };
    mixer.addEventListener("finished", onDone);
    return () => mixer.removeEventListener("finished", onDone);
  }, [mixer, actions]);

  return (
    <group ref={group}>
      <primitive object={object} />
    </group>
  );
}

/** поворот по Y к цели из drag, с затуханием */
function Turntable({ yaw, children }: { yaw: { current: number }; children: ReactNode }) {
  const g = useRef<Group>(null);
  useFrame((_, dt) => {
    const t = g.current;
    if (!t) return;
    t.rotation.y += (yaw.current - t.rotation.y) * (1 - Math.exp(-Math.min(dt, 0.05) * 10));
  });
  return <group ref={g}>{children}</group>;
}

function Podium({ glow }: { glow: string }) {
  const ring = useRef<Group>(null);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.03;
    ring.current?.scale.set(s, s, s);
  });
  return (
    <>
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[1.35, 1.5, 0.36, 64]} />
        <meshStandardMaterial color="#334155" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.28, 1.35, 64]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      <group ref={ring}>
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.82, 64]} />
          <meshBasicMaterial color={glow} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

interface StageProps {
  hero: CharacterId;
  /** видимые узлы реквизита */
  nodes: string[];
  /** цвет искр реликвии */
  aura: string | null;
  gesture: HeroGesture;
}

export function HeroStage({ hero, nodes, aura, gesture }: StageProps) {
  const yaw = useRef(0.4);
  const drag = useRef<{ x: number; from: number } | null>(null);

  return (
    <div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, from: yaw.current };
      }}
      onPointerMove={(e) => {
        if (drag.current) yaw.current = drag.current.from + (e.clientX - drag.current.x) * 0.012;
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <Canvas dpr={[1, 2]} camera={{ position: [0, 1.5, 7.4], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 1.05, 0)}>
        <hemisphereLight args={["#e0f2fe", "#1e293b", 1.25]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 6, 5]} intensity={1.6} />
        <pointLight position={[-2.5, 2.2, 2]} intensity={6} distance={7} decay={1.6} color="#fde68a" />
        <Podium glow={aura ?? "#34d399"} />
        <ContactShadows position={[0, 0.001, 0]} opacity={0.6} scale={5} blur={2.2} far={3} />
        <Turntable yaw={yaw}>
          <Suspense fallback={null}>
            <HeroModel key={hero} hero={hero} nodes={nodes} gesture={gesture} />
          </Suspense>
          {aura && <Sparkles count={46} scale={[2.2, 2.6, 2.2]} position={[0, 1.2, 0]} size={4} speed={0.45} color={aura} />}
        </Turntable>
      </Canvas>
    </div>
  );
}
