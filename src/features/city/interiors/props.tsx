"use client";

// Процедурный реквизит интерьеров, которого нет в паках: мониторы, серверные стойки, кулер,
// кофемашина, люстры, доски с текстом и дашбордами, лифт, ресепшен.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CanvasTexture, PlaneGeometry, SRGBColorSpace, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { GEO, PALETTE, Part, glass, mat, textTexture } from "../kit";
import { FURNITURE, Model } from "../models";

const PLANE = new PlaneGeometry(1, 1);
const HALF_PI = Math.PI / 2;

/** детерминированный генератор для раскладки стикеров и плиток */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** монитор на подставке; экран светится */
export function Monitor({ position = [0, 0, 0], rotation = 0, wide = false }: { position?: [number, number, number]; rotation?: number; wide?: boolean }) {
  const w = wide ? 1.1 : 0.7;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Part size={[0.28, 0.03, 0.2]} color={PALETTE.dark} shadow={false} />
      <Part position={[0, 0.03, 0]} size={[0.05, 0.22, 0.05]} color={PALETTE.dark} shadow={false} />
      <Part position={[0, 0.25, 0]} size={[w, 0.45, 0.04]} color={PALETTE.dark} />
      <Part position={[0, 0.28, 0.021]} size={[w - 0.06, 0.39, 0.01]} color="#bfe3ff" emissive="#7fc4ff" intensity={0.9} shadow={false} />
    </group>
  );
}

/** рабочее место: стол KayKit, монитор, клавиатура; стул отдельно (SeatSpot) */
export function Desk({ position, rotation = 0, monitors = 1 }: { position: [number, number, number]; rotation?: number; monitors?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Model url={FURNITURE.tableMedium} scale={[0.9, 0.78, 0.8]} />
      {monitors === 1 ? (
        <Monitor position={[0, 0.78, -0.35]} />
      ) : (
        <>
          <Monitor position={[-0.42, 0.78, -0.35]} rotation={0.25} />
          <Monitor position={[0.42, 0.78, -0.35]} rotation={-0.25} />
        </>
      )}
      <Part position={[0, 0.78, 0.15]} size={[0.5, 0.03, 0.18]} color="#e8e6e0" shadow={false} />
      <Part position={[0.5, 0.78, 0.12]} size={[0.1, 0.03, 0.14]} color="#e8e6e0" shadow={false} />
    </group>
  );
}

/** серверная стойка: тёмный шкаф, мигающие светодиоды */
export function ServerRack({ position, seed = 0 }: { position: [number, number, number]; seed?: number }) {
  const leds = useRef<Mesh[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    leds.current.forEach((m, i) => {
      if (!m) return;
      const on = Math.sin(t * (3 + ((i + seed) % 5)) + i * 1.7 + seed) > 0.2;
      (m.material as MeshStandardMaterial).emissiveIntensity = on ? 2.2 : 0.15;
    });
  });
  const ledMats = useMemo(() => Array.from({ length: 6 }, (_, i) => mat(i % 3 ? "#3cff8a" : "#ffb347", { emissive: i % 3 ? "#2eff7a" : "#ffa020", intensity: 1 }).clone()), []);
  return (
    <group position={position}>
      <Part size={[0.9, 2.2, 0.9]} color="#22262d" flat={false} />
      <Part position={[0, 0.05, 0.451]} size={[0.8, 2.1, 0.02]} color="#2f343c" shadow={false} />
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i}>
          <Part position={[0, 0.25 + i * 0.32, 0.46]} size={[0.76, 0.22, 0.03]} color="#3a4049" shadow={false} />
          <mesh
            ref={(el) => {
              if (el) leds.current[i] = el;
            }}
            geometry={GEO.box}
            material={ledMats[i]}
            position={[0.28, 0.36 + i * 0.32, 0.48]}
            scale={[0.06, 0.06, 0.02]}
          />
          <Part position={[-0.2, 0.34 + i * 0.32, 0.48]} size={[0.3, 0.04, 0.01]} color="#556070" shadow={false} />
        </group>
      ))}
    </group>
  );
}

/** кулер: бутыль булькает, когда его «использовали» */
export function Cooler({ position, active }: { position: [number, number, number]; active: { current: number } }) {
  const bubbles = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = bubbles.current;
    if (!g) return;
    const on = performance.now() < active.current;
    g.visible = on;
    if (on) g.children.forEach((c, i) => (c.position.y = 0.2 + ((clock.elapsedTime * 0.9 + i * 0.23) % 0.6)));
  });
  return (
    <group position={position}>
      <Part size={[0.42, 1.0, 0.42]} color="#f4f4f2" flat={false} />
      <Part position={[0, 0.6, 0.22]} size={[0.14, 0.12, 0.06]} color="#4aa3df" shadow={false} />
      <Part geo="cyl" position={[0, 1.0, 0]} size={[0.17, 0.5, 0.17]} material={glass("#8fd3ff", { opacity: 0.7 })} />
      <group ref={bubbles} position={[0, 1.0, 0]} visible={false}>
        {[0, 1, 2, 3].map((i) => (
          <Part key={i} geo="sphere" position={[(i - 1.5) * 0.05, 0.2, 0]} size={[0.025, 0.025, 0.025]} color="#ffffff" shadow={false} />
        ))}
      </group>
    </group>
  );
}

/** кофемашина: пар над чашкой, когда варит */
export function CoffeeMachine({ position, rotation = 0, active }: { position: [number, number, number]; rotation?: number; active: { current: number } }) {
  const steam = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = steam.current;
    if (!g) return;
    const on = performance.now() < active.current;
    g.visible = on;
    if (on)
      g.children.forEach((c, i) => {
        const t = (clock.elapsedTime * 0.7 + i * 0.3) % 1;
        c.position.y = 0.35 + t * 0.5;
        c.scale.setScalar(0.5 + t * 0.8);
      });
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Part size={[0.5, 0.55, 0.42]} color="#2b2f36" flat={false} />
      <Part position={[0, 0.55, -0.05]} size={[0.5, 0.12, 0.3]} color="#3b4049" shadow={false} />
      <Part position={[0, 0.3, 0.2]} size={[0.14, 0.1, 0.06]} color="#c9a14a" shadow={false} />
      <Part position={[0, 0.02, 0.22]} size={[0.3, 0.02, 0.16]} color="#8b9099" shadow={false} />
      <Part geo="cyl" position={[0, 0.04, 0.22]} size={[0.06, 0.09, 0.06]} color="#ffffff" shadow={false} />
      <group ref={steam} position={[0, 0, 0.22]} visible={false}>
        {[0, 1, 2].map((i) => (
          <Part key={i} geo="sphere" position={[(i - 1) * 0.03, 0.35, 0]} size={[0.03, 0.03, 0.03]} color="#ffffff" shadow={false} />
        ))}
      </group>
    </group>
  );
}

/** люстра: кольцо с подвесками и тёплый свет */
export function Chandelier({ position, radius = 0.7, light = true }: { position: [number, number, number]; radius?: number; light?: boolean }) {
  const n = 8;
  return (
    <group position={position}>
      <Part geo="cyl8" position={[0, 0, 0]} size={[0.02, 0.9, 0.02]} color={PALETTE.metal} shadow={false} />
      <Part geo="torus" position={[0, 0, 0]} rotation={[HALF_PI, 0, 0]} size={[radius, radius, radius]} color="#d4a94a" center shadow={false} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(a) * radius, -0.18, Math.cos(a) * radius]}>
            <Part geo="cyl8" size={[0.01, 0.18, 0.01]} color={PALETTE.metal} shadow={false} />
            <Part geo="sphere" position={[0, -0.12, 0]} size={[0.06, 0.06, 0.06]} color="#fff2c8" emissive="#ffd27a" intensity={1.6} shadow={false} />
          </group>
        );
      })}
      {light && <pointLight position={[0, -0.4, 0]} color="#ffd9a0" intensity={6} distance={9} decay={2} />}
    </group>
  );
}

/** настенная доска с надписью (стоит у стены, смотрит на +z) */
export function TextBoard({ position, text, sub, color = "#2f6f9f", width = 3, height = 1.2, rotation = 0 }: { position: [number, number, number]; text: string; sub?: string; color?: string; width?: number; height?: number; rotation?: number }) {
  const texture = useMemo(() => textTexture(text, { bg: color, fg: "#ffffff", width: 640, height: Math.round((640 * height) / width), sub }), [text, sub, color, width, height]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Part center size={[width + 0.16, height + 0.16, 0.1]} color={PALETTE.dark} shadow={false} />
      <mesh geometry={PLANE} position={[0, 0, 0.06]} scale={[width, height, 1]}>
        <meshStandardMaterial map={texture} roughness={0.7} />
      </mesh>
    </group>
  );
}

const chartCache = new Map<number, CanvasTexture>();

/** дашборд: столбики и линия на тёмном фоне, детерминированно по seed */
function chartTexture(seed: number) {
  let t = chartCache.get(seed);
  if (t) return t;
  const w = 256;
  const h = 160;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  let s = seed * 7919 + 13;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  ctx.fillStyle = "#101826";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e7eef7";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText(["Latency p95", "Conversion", "Active users", "Skill gaps", "NPS", "Throughput"][seed % 6], 12, 22);
  const colors = ["#4fc3f7", "#81c784", "#ffb74d", "#ba68c8", "#ef5350"];
  if (seed % 2 === 0) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const v = 30 + rand() * 90;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(16 + i * 29, h - 16 - v, 20, v);
    }
  } else {
    ctx.strokeStyle = colors[seed % colors.length];
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const x = 16 + i * 22;
      const y = h - 24 - rand() * 90;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#e7eef7";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.fillText(`${Math.round(40 + rand() * 59)}%`, w - 80, 34);
  }
  ctx.strokeStyle = "#2b3a52";
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  chartCache.set(seed, t);
  return t;
}

/** экран с дашбордом на стене */
export function DashboardScreen({ position, seed, width = 1.6, rotation = 0 }: { position: [number, number, number]; seed: number; width?: number; rotation?: number }) {
  const texture = useMemo(() => chartTexture(seed), [seed]);
  const height = width * 0.625;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Part center size={[width + 0.08, height + 0.08, 0.06]} color="#1c2028" shadow={false} />
      <mesh geometry={PLANE} position={[0, 0, 0.04]} scale={[width, height, 1]}>
        <meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** лифт: рама, две створки, табло; в интерьере смотрит на +z */
export function Elevator({ position, floorLabel }: { position: [number, number, number]; floorLabel: string }) {
  const texture = useMemo(() => textTexture(floorLabel, { bg: "#1c2028", fg: "#ffd166", width: 256, height: 96 }), [floorLabel]);
  return (
    <group position={position}>
      <Part size={[2.6, 2.9, 0.5]} color="#c8ccd2" flat={false} />
      <Part position={[-0.55, 0.05, 0.22]} size={[0.95, 2.5, 0.1]} color="#9aa3ad" flat={false} metalness={0.6} roughness={0.35} />
      <Part position={[0.55, 0.05, 0.22]} size={[0.95, 2.5, 0.1]} color="#9aa3ad" flat={false} metalness={0.6} roughness={0.35} />
      <Part position={[0, 0.05, 0.25]} size={[0.06, 2.5, 0.06]} color={PALETTE.dark} shadow={false} />
      <mesh geometry={PLANE} position={[0, 2.68, 0.27]} scale={[0.9, 0.34, 1]}>
        <meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.7} />
      </mesh>
      <Part position={[1.5, 1.05, 0.2]} size={[0.16, 0.26, 0.05]} color={PALETTE.dark} shadow={false} />
      <Part geo="sphere" position={[1.5, 1.15, 0.24]} size={[0.035, 0.035, 0.035]} color="#ffd166" emissive="#ffb703" intensity={1.5} shadow={false} />
      <Part position={[0, 0, 0.6]} size={[2.8, 0.03, 0.8]} color="#b8bec6" shadow={false} />
    </group>
  );
}

/** стойка ресепшена */
export function ReceptionDesk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <Part size={[4.6, 1.1, 0.9]} color="#f3efe7" flat={false} />
      <Part position={[0, 0.2, 0.46]} size={[4.6, 0.7, 0.04]} color={color} shadow={false} />
      <Part position={[0, 1.1, 0]} size={[4.8, 0.08, 1.1]} color={PALETTE.wood} shadow={false} />
      <Monitor position={[1.2, 1.18, -0.1]} rotation={Math.PI + 0.3} />
      <Model url={FURNITURE.cactusSmall} position={[-1.7, 1.18, -0.1]} scale={0.8} />
      <Part position={[-0.4, 1.18, -0.1]} size={[0.5, 0.06, 0.3]} color="#ffffff" shadow={false} />
    </group>
  );
}

/** кубок для полки продаж */
export function Trophy({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  return (
    <group position={position} scale={size}>
      <Part geo="cyl" size={[0.1, 0.04, 0.1]} color="#2b2f36" shadow={false} />
      <Part geo="cyl" position={[0, 0.04, 0]} size={[0.025, 0.12, 0.025]} color="#e6c15a" metalness={0.8} roughness={0.3} shadow={false} />
      <Part geo="cone" position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]} size={[0.11, 0.16, 0.11]} color="#e6c15a" metalness={0.8} roughness={0.3} shadow={false} />
      <Part geo="torus" position={[0, 0.25, 0]} size={[0.1, 0.1, 0.1]} color="#e6c15a" center shadow={false} />
    </group>
  );
}

/** гарнитура на подставке */
export function Headset({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Part geo="cyl8" size={[0.06, 0.02, 0.06]} color={PALETTE.dark} shadow={false} />
      <Part geo="cyl8" position={[0, 0.02, 0]} size={[0.012, 0.16, 0.012]} color={PALETTE.dark} shadow={false} />
      <Part geo="torus" position={[0, 0.22, 0]} size={[0.09, 0.09, 0.09]} color="#2b2f36" center shadow={false} />
      <Part geo="sphere" position={[-0.09, 0.19, 0]} size={[0.035, 0.035, 0.035]} color="#4a90d9" shadow={false} />
      <Part geo="sphere" position={[0.09, 0.19, 0]} size={[0.035, 0.035, 0.035]} color="#4a90d9" shadow={false} />
    </group>
  );
}

/** телефон или планшет на стенде */
export function Device({ position, w = 0.14, h = 0.28, rotation = 0 }: { position: [number, number, number]; w?: number; h?: number; rotation?: number }) {
  return (
    <group position={position} rotation={[-0.35, rotation, 0]}>
      <Part center size={[w, h, 0.015]} color="#1c2028" shadow={false} />
      <Part center position={[0, 0, 0.009]} size={[w - 0.02, h - 0.03, 0.005]} color="#bfe3ff" emissive="#6fb8ff" intensity={0.8} shadow={false} />
    </group>
  );
}

const NOTE_COLORS = ["#ffe066", "#ff9f7a", "#8ce0a4", "#8fd0ff", "#f4a5d5"];

/** стена роадмапа: колонки со стикерами и стрелками */
export function RoadmapWall({ position, width = 5, rotation = 0 }: { position: [number, number, number]; width?: number; rotation?: number }) {
  const notes = useMemo(() => {
    const out: { x: number; y: number; c: string; r: number }[] = [];
    const rand = seeded(3);
    const cols = 4;
    for (let c = 0; c < cols; c++) {
      const n = 2 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) {
        out.push({ x: -width / 2 + 0.6 + c * ((width - 1.2) / (cols - 1)) + (rand() - 0.5) * 0.3, y: 0.55 - i * 0.42 + (rand() - 0.5) * 0.08, c: NOTE_COLORS[Math.floor(rand() * NOTE_COLORS.length)], r: (rand() - 0.5) * 0.15 });
      }
    }
    return out;
  }, [width]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Part center size={[width + 0.2, 2.2, 0.08]} color="#f7f4ee" shadow={false} />
      <Part center position={[0, 0, 0.05]} size={[width, 2, 0.01]} color="#ffffff" shadow={false} />
      {["Q1", "Q2", "Q3", "Q4"].map((q, c) => (
        <TextBoard key={q} position={[-width / 2 + 0.6 + c * ((width - 1.2) / 3), 0.85, 0.06]} text={q} color="#c97a4a" width={0.7} height={0.3} />
      ))}
      <Part center position={[0, 0.62, 0.06]} size={[width - 1, 0.03, 0.01]} color="#c97a4a" shadow={false} />
      {notes.map((n, i) => (
        <mesh key={i} geometry={PLANE} position={[n.x, n.y, 0.07]} rotation={[0, 0, n.r]} scale={[0.34, 0.3, 1]} material={mat(n.c, { flat: false })} />
      ))}
    </group>
  );
}

/** мудборд дизайн-студии: цветные прямоугольники и «макеты экранов» */
export function MoodBoard({ position, rotation = 0, width = 3 }: { position: [number, number, number]; rotation?: number; width?: number }) {
  const tiles = useMemo(() => {
    const out: { x: number; y: number; w: number; h: number; c: string }[] = [];
    const cols = ["#5fa8a0", "#f4c95d", "#ee6c4d", "#3d5a80", "#98c1d9", "#e0fbfc", "#293241"];
    const rand = seeded(9);
    for (let i = 0; i < 12; i++) out.push({ x: -width / 2 + 0.3 + rand() * (width - 0.6), y: -0.6 + rand() * 1.2, w: 0.25 + rand() * 0.5, h: 0.2 + rand() * 0.4, c: cols[i % cols.length] });
    return out;
  }, [width]);
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Part center size={[width + 0.2, 1.9, 0.08]} color="#3b3f46" shadow={false} />
      <Part center position={[0, 0, 0.045]} size={[width, 1.7, 0.01]} color="#f2efe9" shadow={false} />
      {tiles.map((t, i) => (
        <mesh key={i} geometry={PLANE} position={[t.x, t.y, 0.06 + i * 0.001]} scale={[t.w, t.h, 1]} material={mat(t.c, { flat: false })} />
      ))}
    </group>
  );
}

/** большое окно в задней стене с видом на город (градиент) */
export function SkylineWindow({ width, height = 2.4, y = 0.4, z }: { width: number; height?: number; y?: number; z: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#9ed0ea");
    g.addColorStop(1, "#e4f1f7");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    const rand = seeded(17);
    for (let i = 0; i < 26; i++) {
      const w = 16 + rand() * 30;
      const h = 40 + rand() * 120;
      ctx.fillStyle = `rgba(70, 90, 120, ${0.25 + rand() * 0.3})`;
      ctx.fillRect(i * 20, 256 - h, w, h);
    }
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, []);
  const n = Math.max(2, Math.round(width / 1.6));
  return (
    <group position={[0, y + height / 2, z]}>
      <mesh geometry={PLANE} scale={[width, height, 1]}>
        <meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.35} roughness={1} />
      </mesh>
      {Array.from({ length: n + 1 }, (_, i) => (
        <Part key={i} center position={[-width / 2 + (i * width) / n, 0, 0.05]} size={[0.08, height, 0.08]} color={PALETTE.dark} shadow={false} />
      ))}
      <Part center position={[0, -height / 2, 0.05]} size={[width, 0.1, 0.1]} color={PALETTE.dark} shadow={false} />
      <Part center position={[0, height / 2, 0.05]} size={[width, 0.1, 0.1]} color={PALETTE.dark} shadow={false} />
    </group>
  );
}
