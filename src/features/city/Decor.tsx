"use client";

import { useLayoutEffect, useRef } from "react";
import { Color, Object3D, type BufferGeometry, type InstancedMesh, type Material } from "three";
import { GROUND } from "@/lib/world";
import { GEO, PALETTE, Part, mat } from "./kit";
import { PLAZA, nearPlace, onRoad } from "./layout";

type Vec3 = [number, number, number];
interface Item {
  p: Vec3;
  s: Vec3;
  r?: number;
  color?: string;
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GREENS = ["#6fae5a", "#5f9f55", "#7fb866", "#88c070", "#5a9a62"];

/** деревья по сетке с дрожанием: не на дорогах и не у зданий; за краем города — лес погуще */
function buildTrees() {
  const rand = rng(7);
  const trunks: Item[] = [];
  const pines: Item[] = [];
  const rounds: Item[] = [];
  const pad = 22;
  for (let x = GROUND.minX - pad; x <= GROUND.maxX + pad; x += 6) {
    for (let z = GROUND.minZ - pad; z <= GROUND.maxZ + pad; z += 6) {
      const px = x + (rand() - 0.5) * 4;
      const pz = z + (rand() - 0.5) * 4;
      const inside = px > GROUND.minX && px < GROUND.maxX && pz > GROUND.minZ && pz < GROUND.maxZ;
      const keep = rand() < (inside ? 0.32 : 0.8);
      if (!keep || (inside && (onRoad(px, pz, 1.5) || nearPlace(px, pz, 3)))) continue;
      const k = 0.8 + rand() * 0.6;
      const color = GREENS[Math.floor(rand() * GREENS.length)];
      trunks.push({ p: [px, 0.6 * k, pz], s: [0.18 * k, 1.2 * k, 0.18 * k], color: PALETTE.wood });
      if (rand() < 0.5) {
        pines.push({ p: [px, 1.2 * k + 1.1 * k, pz], s: [1.3 * k, 2.2 * k, 1.3 * k], r: rand() * 3, color });
        pines.push({ p: [px, 1.2 * k + 2.3 * k, pz], s: [0.95 * k, 1.6 * k, 0.95 * k], r: rand() * 3, color });
      } else {
        rounds.push({ p: [px, 1.2 * k + 0.9 * k, pz], s: [1.2 * k, 1.1 * k, 1.2 * k], r: rand() * 3, color });
      }
    }
  }
  return { trunks, pines, rounds };
}

/** фонари вдоль проспекта и бульвара площадок */
function buildLamps() {
  const poles: Item[] = [];
  const heads: Item[] = [];
  const add = (x: number, z: number) => {
    poles.push({ p: [x, 1.6, z], s: [0.07, 3.2, 0.07] });
    heads.push({ p: [x, 3.3, z], s: [0.22, 0.22, 0.22] });
  };
  for (let z = -46; z <= 46; z += 9) {
    if (Math.abs(z) < PLAZA.radius + 1 || (z > 20 && z < 35)) continue;
    add(-3.4, z);
    add(3.4, z);
  }
  for (let x = -44; x <= 44; x += 11) {
    if (Math.abs(x) < 4) continue;
    add(x, 14.6);
  }
  return { poles, heads };
}

const TREES = buildTrees();
const LAMPS = buildLamps();
const LAMP_HEAD = mat("#fff4d6", { emissive: "#ffd98a", intensity: 0.9 });
const WHITE = mat("#ffffff");

function Instances({ geometry, material, items, shadow = true }: { geometry: BufferGeometry; material: Material; items: Item[]; shadow?: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...it.s);
      o.rotation.set(0, it.r ?? 0, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (it.color) mesh.setColorAt(i, c.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} castShadow={shadow} receiveShadow />;
}

/** скамейки по кругу площади, лицом к юрте */
function Benches() {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const r = PLAZA.radius - 2.2;
    return (
      <group key={i} position={[Math.sin(a) * r, 0, Math.cos(a) * r]} rotation={[0, a, 0]}>
        <Part position={[0, 0.4, 0]} size={[1.6, 0.1, 0.5]} color={PALETTE.wood} />
        <Part position={[0, 0.5, 0.22]} size={[1.6, 0.45, 0.08]} color={PALETTE.wood} />
        <Part position={[-0.65, 0, 0]} size={[0.1, 0.4, 0.45]} color={PALETTE.dark} />
        <Part position={[0.65, 0, 0]} size={[0.1, 0.4, 0.45]} color={PALETTE.dark} />
      </group>
    );
  });
}

export function Decor() {
  return (
    <group>
      <Instances geometry={GEO.cyl8} material={WHITE} items={TREES.trunks} />
      <Instances geometry={GEO.cone6} material={WHITE} items={TREES.pines} />
      <Instances geometry={GEO.ico} material={WHITE} items={TREES.rounds} />
      <Instances geometry={GEO.cyl8} material={mat(PALETTE.dark)} items={LAMPS.poles} />
      <Instances geometry={GEO.sphere} material={LAMP_HEAD} items={LAMPS.heads} shadow={false} />
      <Benches />
    </group>
  );
}
