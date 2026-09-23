"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, Mesh } from "three";
import { actions, getState, useClientStore } from "@/lib/client-store";
import type { Grade } from "@/lib/types";
import { GROUND, INTERACT_DISTANCE, PLACES, getPlace } from "@/lib/world";
import { Character, type CharacterAction } from "./Character";
import { GEO, mat } from "./kit";
import type { CharacterId } from "./models";
import { playerPosition, playerYaw } from "./playerState";
import { getScene, interactables, sceneActions, walkBounds } from "./sceneState";

const WALK = 3.4;
const RUN = 7.2;
const ARRIVE = 0.3;
const BODY_PAD = 0.4;
const START: [number, number] = [0, 8];
/** места с интерьером: E у двери входит внутрь, а не открывает панель */
const ENTERABLE = new Set(["office", "venue", "mentor"]);

/** внешность по грейду: класс приключенца растёт вместе с карьерой */
const GRADE_CHARACTER: Record<Grade, CharacterId> = {
  Junior: "rogue",
  Middle: "knight",
  Senior: "mage",
  Lead: "barbarian",
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
const pressed = { up: false, down: false, left: false, right: false, run: false };

function useMovementKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") pressed.run = true;
      const key = KEYS[e.code];
      if (!key || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      pressed[key] = true;
      if (e.code.startsWith("Arrow")) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") pressed.run = false;
      const key = KEYS[e.code];
      if (key) pressed[key] = false;
    };
    const reset = () => {
      pressed.up = pressed.down = pressed.left = pressed.right = pressed.run = false;
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

/** E / Enter / Esc в фазе перехвата: интерьеры и объекты важнее панелей HUD */
function useInteractKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target)) return;
      const scene = getScene();
      const onControl = e.target instanceof HTMLElement && !!e.target.closest("button, a, [role=option], [role=combobox]");
      if (e.code === "KeyE" || ((e.code === "Enter" || e.code === "NumpadEnter") && !onControl)) {
        if (scene.fade) return;
        if (scene.elevator) return;
        if (scene.hint) {
          e.stopImmediatePropagation();
          e.preventDefault();
          scene.hint.onInteract();
          return;
        }
        if (scene.mode === "street") {
          const near = getState().nearPlaceId;
          const place = near ? getPlace(near) : undefined;
          if (place && ENTERABLE.has(place.kind)) {
            e.stopImmediatePropagation();
            e.preventDefault();
            actions.closePanel();
            sceneActions.enter(place.id);
          }
        }
      } else if (e.code === "Escape") {
        if (scene.elevator) {
          e.stopImmediatePropagation();
          sceneActions.openElevator(false);
          return;
        }
        if (getState().openPanel) return;
        if (scene.seated) {
          e.stopImmediatePropagation();
          sceneActions.stand();
          return;
        }
        if (scene.mode === "interior" && !scene.fade) {
          e.stopImmediatePropagation();
          sceneActions.exit();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
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
  const marker = useRef<Mesh>(null);
  const motion = useRef({ seq: -1, spawnSeq: -1, gestureSeq: -1, gestureUntil: 0, yaw: 0, sitting: false });
  const action = useRef<CharacterAction>("idle");
  const grade = useClientStore((s) => s.profile?.employee.grade ?? s.employees.find((e) => e.employee_id === s.employeeId)?.grade);
  const model = GRADE_CHARACTER[grade ?? "Junior"];

  useMovementKeys();
  useInteractKeys();

  useFrame((_, rawDelta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDelta, 0.05);
    const s = getState();
    const scene = getScene();
    const m = motion.current;
    const pos = playerPosition;
    const street = scene.mode === "street";
    const now = performance.now();

    // Телепорт: первый кадр, новый seq из HUD или спавн после смены сцены.
    if (m.seq === -1 && !s.teleport) {
      pos.set(START[0], 0, START[1]);
      m.seq = 0;
    }
    if (s.teleport && s.teleport.seq !== m.seq) {
      m.seq = s.teleport.seq;
      if (!street) sceneActions.exit(true);
      pos.set(s.teleport.position[0], 0, s.teleport.position[1]);
      m.yaw = 0;
    }
    if (scene.spawn && scene.spawn.seq !== m.spawnSeq) {
      m.spawnSeq = scene.spawn.seq;
      pos.set(scene.spawn.position[0], 0, scene.spawn.position[1]);
      m.yaw = scene.spawn.yaw;
      actions.clearMoveTarget();
    }

    // Жест (cheer / interact): проигрывается один раз, потом idle.
    if (scene.gesture && scene.gesture.seq !== m.gestureSeq) {
      m.gestureSeq = scene.gesture.seq;
      m.gestureUntil = now + 1400;
      action.current = scene.gesture.action;
    }

    // Направление: клавиши важнее клика.
    let dx = (pressed.right ? 1 : 0) - (pressed.left ? 1 : 0);
    let dz = (pressed.down ? 1 : 0) - (pressed.up ? 1 : 0);
    const keys = dx !== 0 || dz !== 0;

    // Сидит: встаёт при любом движении.
    if (scene.seated) {
      if (keys || s.moveTarget) {
        sceneActions.stand();
        pos.x += Math.sin(scene.seated.yaw) * 0.7;
        pos.z += Math.cos(scene.seated.yaw) * 0.7;
      } else {
        pos.set(scene.seated.position[0], scene.seated.position[1], scene.seated.position[2]);
        m.yaw = scene.seated.yaw;
        action.current = scene.seated.floor ? "sitfloor" : "sit";
        g.position.set(pos.x, pos.y, pos.z);
        g.rotation.y = m.yaw;
        playerYaw.value = m.yaw;
        return;
      }
    }

    let speed = pressed.run ? RUN : WALK;
    let step = speed * dt;
    let auto = false;
    if (keys) {
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
        speed = dist > 4 ? RUN : WALK;
        step = Math.min(speed * dt, dist);
        auto = true;
      }
    }

    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      pos.x += dx * step;
      pos.z += dz * step;
      m.yaw = angleLerp(m.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 14));
      if (m.gestureUntil) m.gestureUntil = 0;
    }

    // Коллизии: круги мест на улице или блокеры интерьера; при автоходьбе обходим сбоку.
    const circles = street ? PLACES : walkBounds.blockers;
    for (const c of circles) {
      const cx = "position" in c ? c.position[0] : c.x;
      const cz = "position" in c ? c.position[1] : c.z;
      const cr = "position" in c ? c.radius : c.r;
      const ox = pos.x - cx;
      const oz = pos.z - cz;
      const min = cr + BODY_PAD;
      const d = Math.hypot(ox, oz);
      if (d >= min || d === 0) continue;
      const nx = ox / d;
      const nz = oz / d;
      pos.x = cx + nx * min;
      pos.z = cz + nz * min;
      if (auto) {
        const side = dx * nz - dz * nx >= 0 ? 1 : -1;
        pos.x += -nz * side * step * 0.6;
        pos.z += nx * side * step * 0.6;
      }
    }
    const b = street ? GROUND : walkBounds;
    pos.x = Math.min(b.maxX - 0.5, Math.max(b.minX + 0.5, pos.x));
    pos.z = Math.min(b.maxZ - 0.5, Math.max(b.minZ + 0.5, pos.z));
    pos.y = 0;

    // Ближайшее место (улица) и ближайший интерактивный объект (везде).
    let nearId: string | null = null;
    if (street) {
      let nearGap = Infinity;
      for (const p of PLACES) {
        const gap = Math.hypot(pos.x - p.position[0], pos.z - p.position[1]) - p.radius;
        if (gap <= INTERACT_DISTANCE && gap < nearGap) {
          nearGap = gap;
          nearId = p.id;
        }
      }
    }
    actions.setNearPlace(nearId);

    let best = null;
    let bestD = Infinity;
    for (const it of interactables.values()) {
      const d = Math.hypot(pos.x - it.position[0], pos.z - it.position[2]);
      if (d <= it.radius && d < bestD) {
        bestD = d;
        best = it;
      }
    }
    sceneActions.setHint(best);

    // Анимация и вид.
    if (m.gestureUntil && now < m.gestureUntil && !moving) {
      // жест доигрывает
    } else {
      m.gestureUntil = 0;
      action.current = moving ? (speed >= RUN - 0.01 ? "run" : "walk") : "idle";
    }
    g.position.set(pos.x, 0, pos.z);
    g.rotation.y = m.yaw;
    playerYaw.value = m.yaw;

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
        <Character model={model} actionRef={action} />
      </group>
      <mesh ref={marker} geometry={GEO.ring} material={mat("#ffffff", { emissive: "#ffffff", intensity: 0.35 })} rotation={[-Math.PI / 2, 0, 0]} visible={false} />
    </>
  );
}
