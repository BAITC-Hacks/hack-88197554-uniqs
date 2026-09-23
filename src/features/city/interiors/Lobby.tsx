"use client";

// Лобби башни: ресепшен с NPC, лифт, доска отдела, зона ожидания, кулер.

import { useCallback, useRef } from "react";
import { actions } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { DEPARTMENT_COLOR } from "@/lib/world";
import { Character } from "../Character";
import { PALETTE, Part } from "../kit";
import { FURNITURE, Model } from "../models";
import { sceneActions } from "../sceneState";
import { TOWER_STYLE } from "../Tower";
import { Cooler, Elevator, ReceptionDesk, TextBoard } from "./props";
import { Blocker, Interactable, Room, SeatSpot } from "./Room";

const RECEPTION: [number, number, number] = [0, 0, -4.5];
const ELEVATOR: [number, number, number] = [5.8, 0, -6.75];
const ELEVATOR_SPOT: [number, number, number] = [5.8, 0, -5.4];
const BOARD_SPOT: [number, number, number] = [-7.6, 0, -2];
const COOLER: [number, number, number] = [-7.6, 0, -6.2];
const COOLER_SPOT: [number, number, number] = [-7.2, 0, -5.3];
const RECEPTION_SPOT: [number, number, number] = [0, 0, -3.4];
const COUCH_L: [number, number, number] = [4.9, 0, -0.9];
const COUCH_R: [number, number, number] = [6.3, 0, -0.9];

export function Lobby({ place }: { place: Place }) {
  const dept = place.department!;
  const color = DEPARTMENT_COLOR[dept];
  const style = TOWER_STYLE[dept];
  const cooler = useRef(0);

  const openBoard = useCallback(() => actions.openPanel("office", place.id), [place.id]);
  const openElevator = useCallback(() => sceneActions.openElevator(true), []);
  const useCooler = useCallback(() => {
    cooler.current = performance.now() + 2600;
    sceneActions.gesture("interact");
    sceneActions.say("cooler", "Буль-буль… Свежая вода. Уже не Junior-кулер!");
  }, []);
  const talk = useCallback(() => {
    sceneActions.say("reception", `Добро пожаловать в башню ${style.short}! Лифт справа, доска отдела слева.`);
  }, [style.short]);

  return (
    <Room w={18} d={14} floor="#e3ddd1" wall="#f4f0e8">
      {/* ресепшен */}
      <ReceptionDesk position={RECEPTION} color={color} />
      <Blocker x={0} z={-4.5} r={2.4} />
      <group position={[0, 0, -5.7]}>
        <Character model="mage" action="idle" />
      </group>
      <Interactable id="reception" label="Поговорить" position={RECEPTION_SPOT} radius={1.8} onInteract={talk} />
      <TextBoard position={[0, 2.3, -6.75]} text={`Башня ${style.short}`} sub={dept} color={color} width={5} height={1.3} />
      <Part position={[0, 0, -6.55]} size={[12, 0.05, 0.4]} color={color} shadow={false} />

      {/* лифт */}
      <Elevator position={ELEVATOR} floorLabel="Лобби" />
      <Blocker x={5.8} z={-6.6} r={1.2} />
      <Interactable id="elevator" label="Лифт: выбрать этаж" position={ELEVATOR_SPOT} radius={1.8} onInteract={openElevator} />

      {/* доска отдела */}
      <TextBoard position={[-8.7, 1.7, -2]} rotation={Math.PI / 2} text="Доска отдела" sub="лестница грейдов и прогресс" color={color} width={3.2} height={1.3} />
      <Interactable id="board" label="Доска отдела" position={BOARD_SPOT} radius={1.8} onInteract={openBoard} />

      {/* кулер и растения */}
      <Cooler position={COOLER} active={cooler} />
      <Blocker x={-7.6} z={-6.2} r={0.5} />
      <Interactable id="cooler" label="Кулер" position={COOLER_SPOT} radius={1.5} onInteract={useCooler} />
      <Model url={FURNITURE.cactusA} position={[-5.6, 0, -6.2]} scale={1.1} />
      <Model url={FURNITURE.cactusB} position={[8.2, 0, 5.8]} scale={1.1} />
      <Model url={FURNITURE.cactusB} position={[-8.2, 0, 5.8]} scale={1} />

      {/* зона ожидания */}
      <Model url={FURNITURE.rug} position={[5.6, 0, 0.4]} scale={[1.6, 1, 1.5]} />
      <Model url={FURNITURE.couch} position={[5.6, 0, -1.3]} scale={0.85} />
      <SeatSpot id="couch-l" position={COUCH_L} yaw={0} />
      <SeatSpot id="couch-r" position={COUCH_R} yaw={0} />
      <Blocker x={5.6} z={-1.6} r={1.2} />
      <Model url={FURNITURE.tableLow} position={[5.6, 0, 1.0]} scale={0.8} />
      <Blocker x={5.6} z={1.0} r={0.9} />
      <Model url={FURNITURE.books} position={[5.3, 0.42, 1.0]} scale={0.7} rotation={[0, 0.4, 0]} />
      <Model url={FURNITURE.armchair} position={[3.2, 0, 0.9]} scale={0.85} rotation={[0, Math.PI / 2, 0]} />
      <Model url={FURNITURE.armchair} position={[8.0, 0, 0.9]} scale={0.85} rotation={[0, -Math.PI / 2, 0]} />
      <Blocker x={3.2} z={0.9} r={0.7} />
      <Blocker x={8} z={0.9} r={0.7} />
      <Model url={FURNITURE.lampStanding} position={[8.2, 0, -2.6]} scale={0.9} />
      <Model url={FURNITURE.pictureLarge} position={[8.75, 1.8, 1.5]} scale={1} rotation={[0, -Math.PI / 2, 0]} />

      {/* NPC ждёт на диване */}
      <group position={[4.9, 0, -0.9]}>
        <Character model="rogue" action="sit" phase={0.4} />
      </group>
      <Part position={[0, 0, 5.3]} size={[3, 0.02, 2]} color={PALETTE.stone} shadow={false} />
    </Room>
  );
}
