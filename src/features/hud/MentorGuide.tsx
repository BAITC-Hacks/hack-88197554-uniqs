"use client";

// Наставник идёт за игроком во время тура (рендерится в <Canvas> через city/extras.ts).
// После тура уходит к юрте и исчезает. Внешность та же, что у наставника в юрте.

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { Character, type CharacterAction } from "@/features/city/Character";
import { playerPosition } from "@/features/city/playerState";
import { useScene } from "@/features/city/sceneState";
import { PLACES, getPlace } from "@/lib/world";
import { getTour, tourActions, useTour } from "./tour";

const KEEP = 1.5;
const BODY = 0.4;
const LEAVE_MS = 8000;

function angleLerp(from: number, to: number, t: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * t;
}

function Follower() {
  const root = useRef<Group>(null);
  const action = useRef<CharacterAction>("idle");
  const m = useRef({ seq: -1, x: 0, z: 0, yaw: 0, leaveAt: 0 });

  useFrame((_, rawDelta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDelta, 0.05);
    const s = m.current;
    const tour = getTour();
    const px = playerPosition.x;
    const pz = playerPosition.z;

    // Появление: чуть впереди-справа от игрока, лицом к нему.
    if (s.seq !== tour.seq) {
      s.seq = tour.seq;
      s.x = px + 1.3;
      s.z = pz + 1.1;
      s.yaw = Math.atan2(px - s.x, pz - s.z);
      s.leaveAt = 0;
    }

    let tx = px;
    let tz = pz;
    let keep = KEEP;
    if (tour.leaving) {
      const yurt = getPlace("mentor");
      if (!s.leaveAt) s.leaveAt = performance.now();
      if (yurt) {
        tx = yurt.position[0];
        tz = yurt.position[1];
        keep = yurt.radius + 0.6;
      }
      if (!yurt || Math.hypot(tx - s.x, tz - s.z) <= keep + 0.2 || performance.now() - s.leaveAt > LEAVE_MS) {
        tourActions.gone();
        return;
      }
    }

    const dx = tx - s.x;
    const dz = tz - s.z;
    const dist = Math.hypot(dx, dz);
    // отстал слишком сильно (телепорт игрока) — встаём рядом
    if (!tour.leaving && dist > 16) {
      s.x = px - (dx / dist) * KEEP;
      s.z = pz - (dz / dist) * KEEP;
    } else if (dist > keep) {
      const speed = Math.min(8, (dist - keep) * 3 + 1.5);
      const step = Math.min(speed * dt, dist - keep);
      s.x += (dx / dist) * step;
      s.z += (dz / dist) * step;
      s.yaw = angleLerp(s.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 10));
      action.current = speed > 5 ? "run" : "walk";
    }
    if (dist <= keep + 0.05) {
      action.current = "idle";
      s.yaw = angleLerp(s.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 4));
    }

    // не заходить в здания
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

    g.position.set(s.x, 0, s.z);
    g.rotation.y = s.yaw;
  });

  return (
    <group ref={root}>
      <Character model="mage" actionRef={action} />
    </group>
  );
}

export function MentorGuide() {
  const shown = useTour((s) => s.active || s.leaving);
  const street = useScene((s) => s.mode === "street");
  return shown && street ? <Follower /> : null;
}
