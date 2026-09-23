"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { Matrix4, type BufferGeometry, type Group, type Material, type Mesh } from "three";
import { GROUND } from "@/lib/world";
import { GEO, Instances, PALETTE, mat, type Item } from "./kit";
import { PLAZA, ROADS, SIDEWALK, nearPlace, onRoad } from "./layout";
import { CITY, Model } from "./models";

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GREENS = ["#6fae5a", "#5f9f55", "#7fb866", "#88c070", "#5a9a62", "#9cc46a"];

/** деревья по сетке с дрожанием: не на дорогах и не у зданий; за краем города — лес погуще */
function buildTrees() {
  const rand = rng(7);
  const trunks: Item[] = [];
  const pines: Item[] = [];
  const rounds: Item[] = [];
  const pad = 26;
  for (let x = GROUND.minX - pad; x <= GROUND.maxX + pad; x += 6) {
    for (let z = GROUND.minZ - pad; z <= GROUND.maxZ + pad; z += 6) {
      const px = x + (rand() - 0.5) * 4;
      const pz = z + (rand() - 0.5) * 4;
      const inside = px > GROUND.minX && px < GROUND.maxX && pz > GROUND.minZ && pz < GROUND.maxZ;
      const keep = rand() < (inside ? 0.3 : 0.85);
      if (!keep || (inside && (onRoad(px, pz, SIDEWALK + 2.2) || nearPlace(px, pz, 4.5)))) continue;
      const k = 0.8 + rand() * 0.7;
      const color = GREENS[Math.floor(rand() * GREENS.length)];
      trunks.push({ p: [px, 0.7 * k, pz], s: [0.2 * k, 1.4 * k, 0.2 * k], color: PALETTE.wood });
      if (rand() < 0.45) {
        pines.push({ p: [px, 1.3 * k + 1.2 * k, pz], s: [1.4 * k, 2.4 * k, 1.4 * k], r: rand() * 3, color });
        pines.push({ p: [px, 1.3 * k + 2.5 * k, pz], s: [1.0 * k, 1.7 * k, 1.0 * k], r: rand() * 3, color });
      } else {
        rounds.push({ p: [px, 1.3 * k + 1.0 * k, pz], s: [1.35 * k, 1.25 * k, 1.35 * k], r: rand() * 3, color });
        if (rand() < 0.5) rounds.push({ p: [px + 0.5 * k, 1.3 * k + 1.5 * k, pz - 0.3 * k], s: [0.9 * k, 0.85 * k, 0.9 * k], r: rand() * 3, color });
      }
    }
  }
  return { trunks, pines, rounds };
}

const horizontal = (r: { w: number; d: number }) => r.w >= r.d;

/** уличная мебель KayKit вдоль тротуаров: фонари через 12 м, между ними гидранты, урны, кусты */
function buildStreetProps() {
  const rand = rng(21);
  const lamps: Item[] = [];
  const hydrants: Item[] = [];
  const bins: Item[] = [];
  const bushes: Item[] = [];
  const benches: Item[] = [];
  const usable = (x: number, z: number) => !onRoad(x, z, -0.1) && Math.hypot(x - PLAZA.x, z - PLAZA.z) > PLAZA.radius + 0.5 && !nearPlace(x, z, 1.2);
  for (const r of ROADS) {
    const h = horizontal(r);
    const len = h ? r.w : r.d;
    const start = h ? r.x - r.w / 2 : r.z - r.d / 2;
    const half = (h ? r.d : r.w) / 2;
    for (let t = 4; t < len - 3; t += 12) {
      for (const side of [-1, 1]) {
        const c = start + t + (side > 0 ? 6 : 0);
        if (c > start + len - 3) continue;
        const off = side * (half + SIDEWALK - 0.45);
        const x = h ? c : r.x + off;
        const z = h ? r.z + off : c;
        if (!usable(x, z)) continue;
        // рука фонаря смотрит в -x модели; поворачиваем к дороге
        const toward = h ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : side > 0 ? Math.PI : 0;
        lamps.push({ p: [x, 0.04, z], s: [3.2, 3.2, 3.2], r: toward });
        const dx = h ? 3 : 0;
        const dz = h ? 0 : 3;
        const roll = rand();
        if (roll < 0.35) hydrants.push({ p: [x + dx, 0.04, z + dz], s: [3, 3, 3] });
        else if (roll < 0.6) bins.push({ p: [x + dx, 0.04, z + dz], s: [3, 3, 3] });
        else if (roll < 0.85) bushes.push({ p: [x + dx, 0.04, z + dz], s: [2.4, 2.4, 2.4], r: rand() * 6 });
        else benches.push({ p: [x + dx, 0.04, z + dz], s: [3, 3, 3], r: toward + Math.PI });
      }
    }
  }
  // скамейки по кругу площади, лицом к юрте
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const r = PLAZA.radius - 2.2;
    benches.push({ p: [Math.sin(a) * r, 0.04, Math.cos(a) * r], s: [3, 3, 3], r: a + Math.PI });
  }
  return { lamps, hydrants, bins, bushes, benches };
}

/** машины у обочин делового квартала и кольца площадок */
function buildParkedCars() {
  const rand = rng(33);
  const models = [CITY.carSedan, CITY.carHatchback, CITY.carWagon, CITY.carTaxi];
  const cars: { url: string; p: [number, number, number]; r: number }[] = [];
  const spots: { x: number; z: number; r: number }[] = [
    { x: -33, z: -16.9, r: Math.PI / 2 },
    { x: -14, z: -16.9, r: Math.PI / 2 },
    { x: 20, z: -16.9, r: Math.PI / 2 },
    { x: 34, z: -19.1, r: -Math.PI / 2 },
    { x: -22, z: -35.1, r: -Math.PI / 2 },
    { x: 13, z: -32.9, r: Math.PI / 2 },
    { x: -30, z: 13.1, r: Math.PI / 2 },
    { x: 36, z: 10.9, r: -Math.PI / 2 },
    { x: -46.8, z: 20, r: Math.PI },
    { x: 46.8, z: 44, r: 0 },
    { x: -1.3, z: 42, r: Math.PI },
    { x: -1.3, z: -44, r: Math.PI },
  ];
  for (const s of spots) cars.push({ url: models[Math.floor(rand() * models.length)], p: [s.x, 0.02, s.z], r: s.r });
  return cars;
}

const TREES = buildTrees();
const PROPS = buildStreetProps();
const PARKED = buildParkedCars();
const WHITE = mat("#ffffff");
const LAMP_GLOW = mat("#fff4d6", { emissive: "#ffd98a", intensity: 1.2 });

/** инстансы одной GLTF-модели (первый меш): геометрия и материал из пака */
function InstancedModel({ url, items, shadow = true }: { url: string; items: Item[]; shadow?: boolean }) {
  const { scene } = useGLTF(url);
  const parts = useMemo(() => {
    const out: { geometry: BufferGeometry; material: Material }[] = [];
    scene.updateWorldMatrix(true, true);
    scene.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      const g = m.geometry.clone();
      g.applyMatrix4(new Matrix4().copy(m.matrixWorld));
      out.push({ geometry: g, material: m.material as Material });
    });
    return out;
  }, [scene]);
  return parts.map((p, i) => <Instances key={i} geometry={p.geometry} material={p.material} items={items} shadow={shadow} />);
}

/** пара машин едет по кольцу делового квартала и кольцу площадок */
const CAR_LOOPS: [number, number][][] = [
  [
    [-39, -19],
    [39, -19],
    [39, -33],
    [-39, -33],
  ],
  [
    [41, -17],
    [-41, -17],
    [-41, -35],
    [41, -35],
  ],
  [
    [-47.2, 13],
    [47.2, 13],
    [47.2, 35.2],
    [-47.2, 35.2],
  ],
  [
    [48.8, 11],
    [-48.8, 11],
    [-48.8, 36.8],
    [48.8, 36.8],
  ],
];

function loopLength(loop: [number, number][]) {
  let l = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    l += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return l;
}

/** точка и направление на замкнутой ломаной по пройденному пути */
export function alongLoop(loop: [number, number][], dist: number, out: { x: number; z: number; yaw: number }) {
  const total = loopLength(loop);
  let d = ((dist % total) + total) % total;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= seg) {
      const t = seg === 0 ? 0 : d / seg;
      out.x = a[0] + (b[0] - a[0]) * t;
      out.z = a[1] + (b[1] - a[1]) * t;
      out.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
      return out;
    }
    d -= seg;
  }
  return out;
}

function MovingCar({ url, loop, offset, speed }: { url: string; loop: [number, number][]; offset: number; speed: number }) {
  const ref = useRef<Group>(null);
  const state = useRef({ d: offset, p: { x: 0, z: 0, yaw: 0 } });
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = state.current;
    s.d += speed * Math.min(dt, 0.05);
    alongLoop(loop, s.d, s.p);
    g.position.set(s.p.x, 0.02, s.p.z);
    // плавный поворот на углах
    let diff = s.p.yaw - g.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.rotation.y += diff * Math.min(1, dt * 6);
  });
  return (
    <group ref={ref}>
      <Model url={url} scale={4} />
    </group>
  );
}

export function Decor() {
  return (
    <group>
      <Instances geometry={GEO.cyl8} material={WHITE} items={TREES.trunks} />
      <Instances geometry={GEO.cone6} material={WHITE} items={TREES.pines} />
      <Instances geometry={GEO.ico} material={WHITE} items={TREES.rounds} />
      <Suspense fallback={null}>
        <InstancedModel url={CITY.streetlight} items={PROPS.lamps} />
        <InstancedModel url={CITY.hydrant} items={PROPS.hydrants} />
        <InstancedModel url={CITY.trashA} items={PROPS.bins} />
        <InstancedModel url={CITY.bush} items={PROPS.bushes} />
        <InstancedModel url={CITY.bench} items={PROPS.benches} />
      </Suspense>
      <Instances
        geometry={GEO.sphere}
        material={LAMP_GLOW}
        items={PROPS.lamps.map((l) => ({ p: [l.p[0] - Math.sin((l.r ?? 0) + Math.PI / 2) * 0.55, 2.95, l.p[2] - Math.cos((l.r ?? 0) + Math.PI / 2) * 0.55], s: [0.16, 0.16, 0.16] }))}
        shadow={false}
      />
      {PARKED.map((c, i) => (
        <Model key={i} url={c.url} position={c.p} rotation={[0, c.r, 0]} scale={4} />
      ))}
      <MovingCar url={CITY.carTaxi} loop={CAR_LOOPS[0]} offset={0} speed={7} />
      <MovingCar url={CITY.carSedan} loop={CAR_LOOPS[1]} offset={60} speed={6.5} />
      <MovingCar url={CITY.carPolice} loop={CAR_LOOPS[2]} offset={30} speed={7.5} />
      <MovingCar url={CITY.carHatchback} loop={CAR_LOOPS[3]} offset={110} speed={6} />
      <MovingCar url={CITY.carWagon} loop={CAR_LOOPS[0]} offset={90} speed={6.8} />
    </group>
  );
}
