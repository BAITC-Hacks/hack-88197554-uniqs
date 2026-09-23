"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import { MeshStandardMaterial } from "three";
import { actions } from "@/lib/client-store";
import { GEO, Instances, PALETTE, grassTexture, mat, noiseTexture, type Item } from "./kit";
import { GROUND_CENTER, GROUND_SIZE, PLAZA, ROADS, SIDEWALK, onRoad, type Road } from "./layout";

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

// Слои над травой: мелкий подъём по y + polygonOffset, чтобы не мерцало.
function layer(color: string, offset: number, texture = false) {
  const m = new MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, map: texture ? noiseTexture() : null });
  m.polygonOffset = true;
  m.polygonOffsetFactor = -offset;
  m.polygonOffsetUnits = -offset;
  return m;
}

const grassMat = new MeshStandardMaterial({ color: PALETTE.grass, roughness: 1, map: grassTexture() });
const roadMat = layer(PALETTE.road, 1, true);
const sidewalkMat = layer(PALETTE.sidewalk, 2, true);
const curbMat = layer(PALETTE.curb, 3);
const lineMat = layer(PALETTE.roadLine, 4);
const plazaMat = layer(PALETTE.plaza, 2, true);
const plazaInnerMat = layer(PALETTE.plazaInner, 3);

function onGroundDown(e: ThreeEvent<PointerEvent>) {
  if (e.button !== 0) return;
  e.stopPropagation();
  actions.walkTo([e.point.x, e.point.z]);
}

const horizontal = (r: Road) => r.w >= r.d;

function inPlaza(x: number, z: number, margin = 0) {
  return Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.radius + margin;
}

/** тротуары и бордюры кусками по 2 м, пропуская перекрёстки и площадь */
function buildSidewalks() {
  const walks: Item[] = [];
  const curbs: Item[] = [];
  const seg = 2;
  for (const r of ROADS) {
    const h = horizontal(r);
    const len = (h ? r.w : r.d) + SIDEWALK * 2;
    const start = (h ? r.x - r.w / 2 : r.z - r.d / 2) - SIDEWALK;
    const half = (h ? r.d : r.w) / 2;
    for (let t = 0; t < len; t += seg) {
      const s = Math.min(seg, len - t);
      const c = start + t + s / 2;
      for (const side of [-1, 1]) {
        const off = side * (half + SIDEWALK / 2);
        const x = h ? c : r.x + off;
        const z = h ? r.z + off : c;
        if (onRoad(x, z, -0.05) || inPlaza(x, z, 0.5)) continue;
        walks.push({ p: [x, 0.02, z], s: h ? [s + 0.02, 0.04, SIDEWALK] : [SIDEWALK, 0.04, s + 0.02] });
        const cx = h ? c : r.x + side * (half + 0.08);
        const cz = h ? r.z + side * (half + 0.08) : c;
        if (Math.abs(c - (h ? r.x : r.z)) > (h ? r.w : r.d) / 2) continue;
        curbs.push({ p: [cx, 0.03, cz], s: h ? [s + 0.02, 0.06, 0.16] : [0.16, 0.06, s + 0.02] });
      }
    }
  }
  return { walks, curbs };
}

/** разметка: прерывистая осевая и зебры у перекрёстков */
function buildMarkings() {
  const dashes: Item[] = [];
  const zebra: Item[] = [];
  for (const r of ROADS) {
    const h = horizontal(r);
    const len = h ? r.w : r.d;
    const start = (h ? r.x - r.w / 2 : r.z - r.d / 2) + 1;
    for (let t = 0; t < len - 2; t += 2.6) {
      const c = start + t + 0.7;
      const x = h ? c : r.x;
      const z = h ? r.z : c;
      if (inPlaza(x, z, 2) || ROADS.some((o) => o !== r && Math.abs(x - o.x) < o.w / 2 + 1.2 && Math.abs(z - o.z) < o.d / 2 + 1.2)) continue;
      dashes.push({ p: [x, 0.03, z], s: h ? [1.4, 0.02, 0.14] : [0.14, 0.02, 1.4] });
    }
  }
  // зебры: у каждого перекрёстка, по обе стороны, если дорога продолжается
  for (const a of ROADS) {
    const h = horizontal(a);
    for (const b of ROADS) {
      if (a === b || horizontal(b) === h) continue;
      const overlapX = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
      const overlapZ = Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2);
      if (overlapX <= 0 || overlapZ <= 0) continue;
      const bHalf = h ? b.w / 2 : b.d / 2;
      const bc = h ? b.x : b.z;
      const aMin = h ? a.x - a.w / 2 : a.z - a.d / 2;
      const aMax = h ? a.x + a.w / 2 : a.z + a.d / 2;
      const across = (h ? a.d : a.w) - 0.7;
      const n = Math.max(3, Math.round(across / 0.7));
      for (const side of [-1, 1]) {
        const c = bc + side * (bHalf + 0.9);
        if (c < aMin + 1.5 || c > aMax - 1.5) continue;
        if (inPlaza(h ? c : a.x, h ? a.z : c, 2)) continue;
        for (let i = 0; i < n; i++) {
          const u = -across / 2 + (i + 0.5) * (across / n);
          const x = h ? c : a.x + u;
          const z = h ? a.z + u : c;
          zebra.push({ p: [x, 0.03, z], s: h ? [1.1, 0.02, (across / n) * 0.55] : [(across / n) * 0.55, 0.02, 1.1] });
        }
      }
    }
  }
  return { dashes, zebra };
}

export function Ground() {
  const walks = useMemo(() => buildSidewalks(), []);
  const marks = useMemo(() => buildMarkings(), []);
  return (
    <group>
      {/* дальняя трава за краем города, чтобы не было пустоты */}
      <mesh rotation={FLAT} position={[GROUND_CENTER[0], -0.05, GROUND_CENTER[1]]} material={mat(PALETTE.grassFar)} receiveShadow>
        <planeGeometry args={[600, 600]} />
      </mesh>
      <mesh rotation={FLAT} position={[GROUND_CENTER[0], 0, GROUND_CENTER[1]]} material={grassMat} receiveShadow onPointerDown={onGroundDown}>
        <planeGeometry args={GROUND_SIZE} />
      </mesh>

      {ROADS.map((r, i) => (
        <mesh key={i} geometry={GEO.box} material={roadMat} position={[r.x, 0.01, r.z]} scale={[r.w, 0.02, r.d]} receiveShadow raycast={noRaycast} />
      ))}
      <Instances geometry={GEO.box} material={sidewalkMat} items={walks.walks} shadow={false} />
      <Instances geometry={GEO.box} material={curbMat} items={walks.curbs} shadow={false} />
      <Instances geometry={GEO.box} material={lineMat} items={marks.dashes} shadow={false} />
      <Instances geometry={GEO.box} material={lineMat} items={marks.zebra} shadow={false} />

      <mesh rotation={FLAT} position={[PLAZA.x, 0.03, PLAZA.z]} material={plazaMat} receiveShadow raycast={noRaycast}>
        <circleGeometry args={[PLAZA.radius, 48]} />
      </mesh>
      <mesh rotation={FLAT} position={[PLAZA.x, 0.04, PLAZA.z]} material={plazaInnerMat} receiveShadow raycast={noRaycast}>
        <ringGeometry args={[PLAZA.radius - 1.6, PLAZA.radius - 1, 48]} />
      </mesh>
      <mesh rotation={FLAT} position={[PLAZA.x, 0.04, PLAZA.z]} material={plazaInnerMat} receiveShadow raycast={noRaycast}>
        <ringGeometry args={[4.2, 4.6, 48]} />
      </mesh>
    </group>
  );
}

/** дороги и площадь прозрачны для клика: попадание уходит в траву под ними */
function noRaycast() {}
