"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, Mesh } from "three";
import { actions, getState, useClientStore } from "@/lib/client-store";
import type { Grade } from "@/lib/types";
import { GROUND, INTERACT_DISTANCE, PLACES } from "@/lib/world";
import { GEO, PALETTE, Part, mat } from "./kit";
import { ModelOr } from "./models";
import { playerPosition } from "./playerState";

const SPEED = 8;
const ARRIVE = 0.3;
const BODY_PAD = 0.4;
const START: [number, number] = [0, 8];

const GRADE_COLOR: Record<Grade, string> = {
  Junior: "#6cc49a",
  Middle: "#5b8fd9",
  Senior: "#a57bd6",
  Lead: "#e0a13f",
};

const KEYS: Record<string, "up" | "down" | "left" | "right"> = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** зажатые клавиши движения; общий объект, чтобы useFrame не аллоцировал */
const pressed = { up: false, down: false, left: false, right: false };

function useMovementKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = KEYS[e.code];
      if (!key || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      pressed[key] = true;
      if (e.code.startsWith("Arrow")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const key = KEYS[e.code];
      if (key) pressed[key] = false;
    };
    const reset = () => {
      pressed.up = pressed.down = pressed.left = pressed.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);
}

function angleLerp(from: number, to: number, t: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d * t;
}

export function Player() {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const marker = useRef<Mesh>(null);
  const motion = useRef({ seq: -1, yaw: 0, walk: 0 });
  const grade = useClientStore((s) => s.profile?.employee.grade ?? s.employees.find((e) => e.employee_id === s.employeeId)?.grade);
  const color = GRADE_COLOR[grade ?? "Junior"];

  useMovementKeys();

  useFrame((_, rawDelta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDelta, 0.05);
    const s = getState();
    const m = motion.current;
    const pos = playerPosition;

    // Телепорт: первый кадр или новый seq.
    if (m.seq === -1 && !s.teleport) {
      pos.set(START[0], 0, START[1]);
      m.seq = 0;
    }
    if (s.teleport && s.teleport.seq !== m.seq) {
      m.seq = s.teleport.seq;
      pos.set(s.teleport.position[0], 0, s.teleport.position[1]);
    }

    // Направление: клавиши важнее клика.
    let dx = (pressed.right ? 1 : 0) - (pressed.left ? 1 : 0);
    let dz = (pressed.down ? 1 : 0) - (pressed.up ? 1 : 0);
    let step = SPEED * dt;
    let auto = false;
    if (dx || dz) {
      if (s.moveTarget) actions.clearMoveTarget();
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
    } else if (s.moveTarget) {
      const tx = s.moveTarget.position[0] - pos.x;
      const tz = s.moveTarget.position[1] - pos.z;
      const dist = Math.hypot(tx, tz);
      if (dist < ARRIVE) {
        const openId = s.moveTarget.openPlaceId;
        actions.clearMoveTarget();
        if (openId) actions.openPlace(openId);
      } else {
        dx = tx / dist;
        dz = tz / dist;
        step = Math.min(step, dist);
        auto = true;
      }
    }

    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      pos.x += dx * step;
      pos.z += dz * step;
      m.yaw = angleLerp(m.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 14));
    }

    // Коллизия: выталкиваем из круга места; при автоходьбе обходим сбоку.
    for (const p of PLACES) {
      const ox = pos.x - p.position[0];
      const oz = pos.z - p.position[1];
      const min = p.radius + BODY_PAD;
      const d = Math.hypot(ox, oz);
      if (d >= min || d === 0) continue;
      const nx = ox / d;
      const nz = oz / d;
      pos.x = p.position[0] + nx * min;
      pos.z = p.position[1] + nz * min;
      if (auto) {
        const side = dx * nz - dz * nx >= 0 ? 1 : -1;
        pos.x += -nz * side * step * 0.6;
        pos.z += nx * side * step * 0.6;
      }
    }
    pos.x = Math.min(GROUND.maxX - 0.5, Math.max(GROUND.minX + 0.5, pos.x));
    pos.z = Math.min(GROUND.maxZ - 0.5, Math.max(GROUND.minZ + 0.5, pos.z));

    // Ближайшее место, у которого можно войти.
    let nearId: string | null = null;
    let nearGap = Infinity;
    for (const p of PLACES) {
      const gap = Math.hypot(pos.x - p.position[0], pos.z - p.position[1]) - p.radius;
      if (gap <= INTERACT_DISTANCE && gap < nearGap) {
        nearGap = gap;
        nearId = p.id;
      }
    }
    actions.setNearPlace(nearId);

    // Вид: позиция, поворот, лёгкое покачивание при ходьбе.
    m.walk = moving ? m.walk + dt * 12 : 0;
    g.position.set(pos.x, 0, pos.z);
    g.rotation.y = m.yaw;
    if (body.current) body.current.position.y = moving ? Math.abs(Math.sin(m.walk)) * 0.12 : 0;

    const mk = marker.current;
    if (mk) {
      const target = getState().moveTarget;
      mk.visible = !!target;
      if (target) {
        mk.position.set(target.position[0], 0.06, target.position[1]);
        mk.rotation.z += dt * 2;
      }
    }
  });

  return (
    <>
      <group ref={root}>
        <group ref={body}>
          <ModelOr kind="player">
            <mesh geometry={GEO.capsule} material={mat(color)} position={[0, 0.85, 0]} castShadow receiveShadow />
            {/* кепка с козырьком вперёд — видно, куда смотрит персонаж */}
            <Part geo="cyl" position={[0, 1.62, 0]} size={[0.33, 0.14, 0.33]} color={PALETTE.dark} />
            <Part position={[0, 1.62, 0.3]} size={[0.4, 0.05, 0.32]} color={PALETTE.dark} />
            <Part center geo="sphere" position={[0, 1.3, 0.34]} size={[0.07, 0.07, 0.07]} color={PALETTE.white} shadow={false} />
          </ModelOr>
        </group>
      </group>
      <mesh ref={marker} geometry={GEO.ring} material={mat("#ffffff", { emissive: "#ffffff", intensity: 0.35 })} rotation={[-Math.PI / 2, 0, 0]} visible={false} />
    </>
  );
}
