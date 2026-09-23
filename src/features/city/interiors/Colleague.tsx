"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { Character, type CharacterAction } from "../Character";
import type { CharacterId } from "../models";
import { getScene, sceneActions } from "../sceneState";
import { Blocker, Interactable, SeatSpot } from "./Room";

const MODELS: CharacterId[] = ["rogue", "mage", "knight", "barbarian"];
const LINES = [
  "Привет! У зелёных меток можно выбрать практику или обучение под свою роль.",
  "Давай разберём рабочую ситуацию? Открой «Практику» — там задания с подсказками.",
  "Если не знаешь, с чего начать, обсуди следующий шаг с AI-наставником.",
  "На кофе всегда найдётся минутка. А свой план развития можно продолжить в журнале квестов.",
];

function seedFor(id: string) {
  return Array.from(id).reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
}

/** NPC — вымышленные коллеги; не раскрывают данные других сотрудников. */
export function Colleague({ id, x, z, yaw = 0, seated = false }: { id: string; x: number; z: number; yaw?: number; seated?: boolean }) {
  const seed = seedFor(id);
  const talk = () => sceneActions.say(id, LINES[seed % LINES.length], 4500);
  return <>
    <group position={[x, 0, z]} rotation={[0, yaw, 0]} onClick={(event) => { event.stopPropagation(); talk(); }}>
      <Character model={MODELS[seed % MODELS.length]} action={seated ? "sit" : "idle"} phase={(seed % 10) * 0.31} />
    </group>
    <Blocker x={x} z={z} r={0.35} />
    <Interactable id={id} label="Поговорить с коллегой" position={[x, 0, z]} radius={1.8} onInteract={talk} ring={false} />
  </>;
}

/** Часть кресел занята, остальные сохраняют действие «Сесть». */
export function OfficeSeat({ id, x, z, yaw }: { id: string; x: number; z: number; yaw: number }) {
  return seedFor(id) % 5 === 0
    ? <Colleague id={`colleague-${id}`} x={x} z={z} yaw={yaw} seated />
    : <SeatSpot id={id} position={[x, 0, z]} yaw={yaw} />;
}

/** Короткий маршрут по свободному коридору с паузами на концах. */
export function CorridorColleague({ from, to, phase = 0 }: { from: [number, number]; to: [number, number]; phase?: number }) {
  const root = useRef<Group>(null);
  const action = useRef<CharacterAction>("idle");
  const time = useRef(phase);
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const travel = length / 1.3;
  useFrame((_, delta) => {
    if (!root.current || getScene().fade) return;
    time.current += Math.min(delta, 0.05);
    const t = time.current % (travel * 2 + 6);
    const returning = t >= travel + 3;
    const leg = returning ? t - travel - 3 : t;
    const fraction = Math.min(leg / travel, 1);
    const k = returning ? 1 - fraction : fraction;
    root.current.position.set(from[0] + (to[0] - from[0]) * k, 0, from[1] + (to[1] - from[1]) * k);
    root.current.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]) + (returning ? Math.PI : 0);
    action.current = leg < travel ? "walk" : "idle";
  });
  return <group ref={root} position={[from[0], 0, from[1]]}><Character model="rogue" actionRef={action} phase={phase} /></group>;
}
