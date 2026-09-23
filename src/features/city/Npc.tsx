"use client";

// Прохожие: безликие NPC ходят по тротуарам, у персонажа останавливаются и отвечают репликой на E.

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { Character, type CharacterAction } from "./Character";
import { alongLoop } from "./Decor";
import type { CharacterId } from "./models";
import { playerPosition } from "./playerState";
import { interactables, sceneActions, useScene, type Interactable } from "./sceneState";

const LINES = [
  "Привет! Бегу на воркшоп по System Design.",
  "Наставник сегодня в юрте, загляни.",
  "В Академии новый курс по SQL, говорят, толковый.",
  "Кофе в Кофейне наставников лучший в городе.",
  "Опять компаенс в ЦОН… ничего не качает, зато обязательно.",
  "Сәлем! Как продвигается твой квест?",
  "Слышал, в Data-башне повесили новые дашборды.",
  "Hi! Mentor track really helped me get to Senior.",
  "Public Speaking Club собирается в амфитеатре.",
  "Хочу на Lead, но сначала закрыть критичные навыки.",
];

interface Walker {
  id: string;
  model: CharacterId;
  loop: [number, number][];
  offset: number;
  speed: number;
}

const WALKERS: Walker[] = [
  { id: "npc-1", model: "rogue", loop: ring(7.4, 24), offset: 0, speed: 1.6 },
  { id: "npc-2", model: "mage", loop: ring(7.4, 24), offset: 20, speed: 1.4 },
  { id: "npc-3", model: "knight", loop: [[-3.4, -46], [-3.4, -10], [3.4, -10], [3.4, -46]], offset: 10, speed: 1.8 },
  { id: "npc-4", model: "barbarian", loop: [[-44, -15], [44, -15], [44, 9], [-44, 9]], offset: 40, speed: 1.7 },
  { id: "npc-5", model: "rogue", loop: [[-44, -15], [44, -15], [44, 9], [-44, 9]], offset: 150, speed: 1.5 },
  { id: "npc-6", model: "mage", loop: [[-44, 33.2], [44, 33.2], [44, 39.4], [-44, 39.4]], offset: 5, speed: 1.6 },
  { id: "npc-7", model: "knight", loop: [[-44, 33.2], [44, 33.2], [44, 39.4], [-44, 39.4]], offset: 120, speed: 1.9 },
  { id: "npc-8", model: "barbarian", loop: [[-40, 52.3], [40, 52.3], [40, 46.9], [-40, 46.9]], offset: 60, speed: 1.4 },
  { id: "npc-9", model: "rogue", loop: [[-36, -37], [-36, -47], [36, -47], [36, -37]], offset: 30, speed: 1.7 },
  { id: "npc-10", model: "mage", loop: [[-3.4, 33.5], [-3.4, 46], [3.4, 46], [3.4, 33.5]], offset: 8, speed: 1.5 },
];

function ring(r: number, n: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.sin(a) * r, Math.cos(a) * r];
  });
}

const STOP_DISTANCE = 2.6;

function Walker({ w }: { w: Walker }) {
  const ref = useRef<Group>(null);
  const action = useRef<CharacterAction>("walk");
  const state = useRef({ d: w.offset, p: { x: 0, z: 0, yaw: 0 }, stopped: false });
  const bubble = useScene((s) => s.bubbles[w.id]);
  const connected = useThree((s) => s.events.connected);

  useEffect(() => {
    const it: Interactable = {
      id: w.id,
      label: "Поговорить",
      position: [0, 0, 0],
      radius: STOP_DISTANCE,
      onInteract: () => {
        sceneActions.say(w.id, LINES[(w.id.length * 7 + Math.floor(Math.random() * LINES.length)) % LINES.length]);
        sceneActions.gesture("interact");
      },
    };
    interactables.set(w.id, it);
    return () => {
      interactables.delete(w.id);
    };
  }, [w.id]);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const s = state.current;
    const dist = Math.hypot(playerPosition.x - s.p.x, playerPosition.z - s.p.z);
    const stop = dist < STOP_DISTANCE;
    if (!stop) {
      s.d += w.speed * Math.min(dt, 0.05);
      alongLoop(w.loop, s.d, s.p);
      g.position.set(s.p.x, 0, s.p.z);
      g.rotation.y = s.p.yaw;
      action.current = "walk";
    } else {
      // остановился и повернулся к персонажу
      const yaw = Math.atan2(playerPosition.x - s.p.x, playerPosition.z - s.p.z);
      g.rotation.y += (yaw - g.rotation.y) * Math.min(1, dt * 8);
      action.current = "idle";
    }
    const it = interactables.get(w.id);
    if (it) {
      it.position[0] = s.p.x;
      it.position[2] = s.p.z;
    }
  });

  return (
    <group ref={ref}>
      <Character model={w.model} actionRef={action} phase={w.offset % 1.3} />
      {bubble && connected && (
        <Html position={[0, 2.3, 0]} center zIndexRange={[6, 0]} pointerEvents="none">
          <div className="pointer-events-none w-56 rounded-2xl bg-white px-3 py-2 text-center text-xs text-slate-800 shadow-md ring-1 ring-black/10">
            {bubble.text}
          </div>
        </Html>
      )}
    </group>
  );
}

export function Npcs() {
  return WALKERS.map((w) => <Walker key={w.id} w={w} />);
}
