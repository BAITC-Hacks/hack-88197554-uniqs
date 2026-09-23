"use client";

// Юрта наставника: круглый зал, кереге с орнаментом, дастархан, корпе, наставник-NPC.

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { actions, useClientStore } from "@/lib/client-store";
import { Character } from "../Character";
import { GEO, Instances, PALETTE, Part, mat, type Item } from "../kit";
import { FURNITURE, Model, RESTAURANT } from "../models";
import { sceneActions } from "../sceneState";
import { Chandelier } from "./props";
import { Blocker, ExitDoor, Interactable, SeatSpot, useRoomBounds } from "./Room";

const R = 5.6;
const MENTOR: [number, number, number] = [0, 0, -2.6];
const MENTOR_SPOT: [number, number, number] = [0, 0, -1.3];

const GREETING = { kk: "Сәлем! Қош келдің. Отыр, шай ішейік.", ru: "Привет! Проходи, садись — чай уже налит.", en: "Hi! Come in, sit down — tea is ready." };

function onFloorDown(e: ThreeEvent<PointerEvent>) {
  if (e.button !== 0) return;
  e.stopPropagation();
  actions.walkTo([e.point.x, e.point.z]);
}

let carpetTex: CanvasTexture | null = null;
/** ковёр: бордовое поле с казахским «қошқар мүйіз»-подобным орнаментом из простых фигур */
function carpetTexture() {
  if (carpetTex) return carpetTex;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#8f2d2d";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#e8b04a";
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, size - 24, size - 24);
  ctx.fillStyle = "#e8b04a";
  for (let y = 40; y < size; y += 64) {
    for (let x = 40; x < size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x + 18, y);
      ctx.lineTo(x, y + 18);
      ctx.lineTo(x - 18, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f6e7c8";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8b04a";
    }
  }
  carpetTex = new CanvasTexture(canvas);
  carpetTex.colorSpace = SRGBColorSpace;
  carpetTex.wrapS = carpetTex.wrapT = RepeatWrapping;
  carpetTex.repeat.set(3, 3);
  return carpetTex;
}

export function YurtInterior() {
  useRoomBounds(4.0, 4.0, 0, 3.6, Math.PI);
  const lang = useClientStore((s) => s.profile?.employee.preferred_language ?? "ru");

  const talk = useCallback(() => {
    sceneActions.say("mentor", GREETING[lang]);
    actions.openPanel("mentor");
  }, [lang]);

  const walls = useMemo(() => {
    const items: Item[] = [];
    const lattice: Item[] = [];
    const n = 36;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const x = Math.sin(a) * R;
      const z = Math.cos(a) * R;
      const front = z > R * 0.45;
      const h = front ? 0.7 : 2.4;
      items.push({ p: [x, h / 2, z], s: [1.02, h, 0.25], r: a });
      if (!front) {
        lattice.push({ p: [x, 1.3, z - Math.cos(a) * 0.14], s: [0.05, 1.6, 0.04], r: a });
        lattice.push({ p: [x + Math.cos(a) * 0.4, 1.3, z - Math.sin(a) * 0.4 - Math.cos(a) * 0.14], s: [0.05, 1.6, 0.04], r: a });
      }
    }
    return { items, lattice };
  }, []);

  const ornaments = useMemo(() => {
    const items: Item[] = [];
    const n = 36;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const z = Math.cos(a) * R;
      if (z > R * 0.45) continue;
      items.push({ p: [Math.sin(a) * (R - 0.16), 2.1, z - 0.0], s: [0.5, 0.32, 0.06], r: a, color: k % 2 ? "#c8553d" : "#e8b04a" });
    }
    return items;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={onFloorDown}>
        <circleGeometry args={[R, 48]} />
        <meshStandardMaterial map={carpetTexture()} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={mat("#c9b892")} receiveShadow>
        <planeGeometry args={[40, 40]} />
      </mesh>
      <Instances geometry={GEO.box} material={mat("#f4eee2", { flat: false })} items={walls.items} />
      <Instances geometry={GEO.box} material={mat(PALETTE.wood)} items={walls.lattice} shadow={false} />
      <Instances geometry={GEO.box} material={mat("#ffffff")} items={ornaments} shadow={false} />
      <Part geo="torus" position={[0, 3.6, 0]} rotation={[Math.PI / 2, 0, 0]} size={[1.2, 1.2, 1.2]} color={PALETTE.wood} center shadow={false} />
      <pointLight position={[0, 3.4, 0]} color="#ffd9a0" intensity={14} distance={12} decay={2} />
      <Chandelier position={[0, 3.3, 0]} radius={0.5} light={false} />

      {/* дастархан: низкий круглый стол, чай, баурсаки */}
      <Model url={RESTAURANT.tableRoundSmall} position={[0, 0, -1]} scale={[0.75, 0.42, 0.75]} />
      <Blocker x={0} z={-1} r={1.15} />
      <Part position={[0, 0.42, -1]} size={[1.9, 0.02, 1.9]} color="#f6e7c8" shadow={false} geo="cyl" />
      <Model url={RESTAURANT.bowl} position={[0.35, 0.44, -0.7]} scale={0.6} />
      <Model url={RESTAURANT.bowl} position={[-0.4, 0.44, -1.2]} scale={0.6} />
      <Model url={RESTAURANT.plate} position={[0, 0.44, -1.35]} scale={0.7} />
      {[-0.12, 0, 0.12].map((dx, i) => (
        <Part key={i} geo="sphere" position={[dx, 0.45, -1.35 + (i % 2) * 0.08]} size={[0.06, 0.05, 0.06]} color="#d9953c" shadow={false} />
      ))}
      <group position={[-0.45, 0.44, -0.55]}>
        <Part geo="sphere" position={[0, 0.02, 0]} size={[0.16, 0.14, 0.16]} color="#2f6f9f" />
        <Part geo="cyl8" position={[0, 0.3, 0]} size={[0.03, 0.08, 0.03]} color="#2f6f9f" shadow={false} />
        <Part geo="cyl8" position={[0.16, 0.16, 0]} rotation={[0, 0, -1]} size={[0.02, 0.18, 0.02]} color="#2f6f9f" shadow={false} />
      </group>
      <Model url={RESTAURANT.jarA} position={[3.2, 0, -3.6]} scale={0.8} />
      <Model url={RESTAURANT.jarC} position={[3.7, 0, -3.1]} scale={0.7} />
      <Model url={FURNITURE.cabinetSmall} position={[-3.3, 0, -3.4]} scale={0.9} rotation={[0, 0.6, 0]} />
      <Blocker x={-3.3} z={-3.4} r={0.8} />
      <Blocker x={3.4} z={-3.4} r={0.7} />

      {/* домбра на стене */}
      <group position={[-2.6, 1.3, -4.6]} rotation={[0, 0.5, 0.3]}>
        <Part geo="sphere" size={[0.22, 0.3, 0.08]} color={PALETTE.wood} shadow={false} />
        <Part position={[0, 0.3, 0]} size={[0.05, 0.9, 0.04]} color="#6b4423" shadow={false} />
      </group>

      {/* корпе вокруг стола: сесть на пол */}
      {[
        { x: -1.9, z: -0.8, yaw: Math.PI / 2 },
        { x: 1.9, z: -0.8, yaw: -Math.PI / 2 },
        { x: 0, z: 0.9, yaw: Math.PI },
      ].map((k, i) => (
        <group key={i}>
          <Part position={[k.x, 0, k.z]} rotation={[0, k.yaw, 0]} size={[1.1, 0.12, 0.9]} color={i % 2 ? "#c8553d" : "#2f6f9f"} shadow={false} />
          <Part position={[k.x, 0.12, k.z]} rotation={[0, k.yaw, 0]} size={[0.95, 0.03, 0.75]} color="#e8b04a" shadow={false} />
          <SeatSpot id={`korpe-${i}`} position={[k.x, 0.1, k.z]} yaw={k.yaw} floor label="Сесть к дастархану" />
        </group>
      ))}

      {/* наставник */}
      <Part position={[0, 0, -2.6]} size={[1.2, 0.14, 0.9]} color="#c8553d" shadow={false} />
      <group position={MENTOR}>
        <Character model="mage" action="sitfloor" />
      </group>
      <Blocker x={0} z={-2.6} r={0.6} />
      <Interactable id="mentor" label="Поговорить с наставником" position={MENTOR_SPOT} radius={2.2} onInteract={talk} />

      <ExitDoor z={R - 0.5} />
    </group>
  );
}
