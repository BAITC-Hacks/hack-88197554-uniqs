"use client";

// Академия: аудитория с рядами столов на ступенях, кафедра, лектор-NPC, стойка расписания.

import { useCallback } from "react";
import { actions } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { Character } from "../Character";
import { PALETTE, Part } from "../kit";
import { FURNITURE, Model, type CharacterId } from "../models";
import { sceneActions } from "../sceneState";
import { DashboardScreen, Monitor, TextBoard } from "./props";
import { Blocker, Interactable, Room, SeatSpot } from "./Room";

const ROWS = [
  { z: -1.5, y: 0, npc: [1, 3] },
  { z: 1.2, y: 0.3, npc: [0, 4] },
  { z: 3.9, y: 0.6, npc: [2] },
];
const XS = [-4.5, -2.25, 0, 2.25, 4.5];
const NPC: CharacterId[] = ["rogue", "knight", "mage", "barbarian", "rogue"];

export function Academy({ place }: { place: Place }) {
  const openPanel = useCallback(() => actions.openPanel("venue", place.id), [place.id]);
  const lecturer = useCallback(() => sceneActions.say("lecturer", "Сегодня: SQL for Analysts. Садись, лекция уже идёт."), []);
  return (
    <Room w={18} d={16} floor="#d8cfc0" wall="#efe9dd" spawn={[6.5, 6.4]}>
      {/* кафедра */}
      <Part position={[0, 0, -6]} size={[12, 0.35, 3.4]} color={PALETTE.stone} />
      <Part position={[2.4, 0.35, -5.6]} size={[1.2, 1.1, 0.6]} color={PALETTE.wood} />
      <Monitor position={[2.4, 1.45, -5.6]} rotation={Math.PI} />
      <Blocker x={0} z={-6.2} r={1.5} />
      <Blocker x={-3.5} z={-6.2} r={1.5} />
      <Blocker x={3.5} z={-6.2} r={1.5} />
      <TextBoard position={[-1.5, 2.2, -7.7]} text="Академия" sub="курс дня: SQL for Analysts" color="#3f6fb5" width={6.5} height={2} />
      <DashboardScreen position={[5, 2.1, -7.7]} seed={2} width={2.4} />
      <group position={[2.4, 0.35, -6.5]}>
        <Character model="mage" action="idle" phase={0.2} />
      </group>
      <Interactable id="lecturer" label="Поговорить с лектором" position={[2.4, 0.35, -4.2]} radius={1.6} onInteract={lecturer} />

      {/* ряды на ступенях */}
      {ROWS.map((row, r) => (
        <group key={r}>
          <Part position={[0, 0, row.z + 1.6]} size={[16, row.y + 0.02, 2.7]} color={r % 2 ? "#cfc5b4" : "#d8cfc0"} shadow={false} />
          {XS.map((x, i) => {
            const seat: [number, number, number] = [x, row.y, row.z + 0.9];
            return (
              <group key={i}>
                <Model url={FURNITURE.tableSmall} position={[x, row.y, row.z]} scale={[1.1, 0.78, 0.8]} />
                <Blocker x={x} z={row.z} r={0.9} />
                <Part position={[x - 0.2, row.y + 0.78, row.z]} size={[0.32, 0.02, 0.24]} color="#ffffff" shadow={false} />
                <Model url={FURNITURE.chairA} position={seat} scale={0.85} />
                {row.npc.includes(i) ? (
                  <group position={seat} rotation={[0, Math.PI, 0]}>
                    <Character model={NPC[i]} action="sit" phase={i * 0.4} />
                  </group>
                ) : (
                  <SeatSpot id={`row-${r}-${i}`} position={seat} yaw={Math.PI} label="Сесть на лекцию" />
                )}
              </group>
            );
          })}
        </group>
      ))}

      {/* стойка расписания у входа */}
      <group position={[-5.5, 0, 5.8]}>
        <Part size={[2.6, 1.05, 0.8]} color={PALETTE.wood} />
        <Part position={[0, 1.05, 0]} size={[2.8, 0.06, 1]} color={PALETTE.white} shadow={false} />
        <Part position={[0, 1.1, 0]} size={[0.5, 0.02, 0.4]} color="#3f6fb5" shadow={false} />
      </group>
      <Blocker x={-5.5} z={5.8} r={1.5} />
      <TextBoard position={[-8.7, 1.6, 5]} rotation={Math.PI / 2} text="Расписание" sub="курсы и ближайшие сессии" color="#3f6fb5" width={2.8} height={1.1} />
      <Interactable id="schedule" label="Расписание курсов" position={[-5.5, 0, 4.6]} radius={1.8} onInteract={openPanel} />

      <Model url={FURNITURE.shelfLarge} position={[8.7, 1.5, -2]} scale={1} rotation={[0, -Math.PI / 2, 0]} />
      <Model url={FURNITURE.shelfLarge} position={[8.7, 1.5, 1]} scale={1} rotation={[0, -Math.PI / 2, 0]} />
      <Model url={FURNITURE.cactusA} position={[-8.2, 0, -7]} scale={1.2} />
      <Model url={FURNITURE.cactusB} position={[8.2, 0, 6.8]} scale={1.1} />
      <Model url={FURNITURE.pictureLarge} position={[-8.75, 1.9, -3]} scale={1.1} rotation={[0, Math.PI / 2, 0]} />
    </Room>
  );
}
