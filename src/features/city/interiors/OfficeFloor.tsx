"use client";

// Этаж башни = грейд: Junior open-space → Middle → Senior → Lead-пентхаус. Зона отдела на каждом этаже.

import { useCallback, useMemo, useRef } from "react";
import { actions, useClientStore } from "@/lib/client-store";
import type { Department, Place } from "@/lib/types";
import { GRADES } from "@/lib/types";
import { DEPARTMENT_COLOR, gradeFloor } from "@/lib/world";
import { Character } from "../Character";
import { PALETTE, Part } from "../kit";
import { FURNITURE, Model, type CharacterId } from "../models";
import { sceneActions } from "../sceneState";
import { TOWER_STYLE } from "../Tower";
import { Chandelier, CoffeeMachine, DashboardScreen, Desk, Device, Elevator, Headset, MoodBoard, Monitor, RoadmapWall, ServerRack, SkylineWindow, TextBoard, Trophy } from "./props";
import { Blocker, Interactable, Room, SeatSpot } from "./Room";

const W = 22;
const D = 16;
const ELEVATOR: [number, number, number] = [8.6, 0, -7.75];
const ELEVATOR_SPOT: [number, number, number] = [8.6, 0, -6.4];
const SPAWN: [number, number] = [8.6, -5.2];
const BOARD_SPOT: [number, number, number] = [9.7, 0, -2.5];
const COFFEE_SPOT: [number, number, number] = [-9.4, 0, 5.4];
const NPC_MODELS: CharacterId[] = ["rogue", "knight", "mage", "barbarian"];

interface DeskSpec {
  x: number;
  z: number;
  /** куда смотрит сидящий */
  yaw: number;
  monitors?: number;
  npc?: CharacterId;
}

/** рабочее место со стулом: стул стоит за столом по направлению yaw, сидящий смотрит на монитор */
function Workplace({ d, i, headset }: { d: DeskSpec; i: number; headset?: boolean }) {
  const cx = d.x - Math.sin(d.yaw) * 0.75;
  const cz = d.z - Math.cos(d.yaw) * 0.75;
  const seat = useMemo<[number, number, number]>(() => [cx, 0, cz], [cx, cz]);
  return (
    <group>
      <Desk position={[d.x, 0, d.z]} rotation={d.yaw} monitors={d.monitors ?? 1} />
      {headset && <Headset position={[d.x + Math.cos(d.yaw) * 0.7, 0.78, d.z - Math.sin(d.yaw) * 0.7]} />}
      <Blocker x={d.x} z={d.z} r={1.05} />
      <Model url={FURNITURE.chairB} position={seat} scale={0.85} rotation={[0, d.yaw + Math.PI, 0]} />
      {d.npc ? (
        <group position={seat} rotation={[0, d.yaw, 0]}>
          <Character model={d.npc} action="sit" phase={(i % 5) * 0.37} />
        </group>
      ) : (
        <SeatSpot id={`desk-${i}`} position={seat} yaw={d.yaw} label="Сесть за стол" />
      )}
    </group>
  );
}

function desksFor(floor: number): DeskSpec[] {
  const out: DeskSpec[] = [];
  if (floor === 0) {
    // open-space 4×2, половина мест занята
    [-8, -5, -2, 1].forEach((x, c) =>
      [-3.5, 1.5].forEach((z, r) => out.push({ x, z, yaw: Math.PI, npc: (c + r) % 2 ? NPC_MODELS[(c + r * 3) % 4] : undefined })),
    );
  } else if (floor === 1) {
    [-7.5, -4, -0.5].forEach((x, c) => [-3.5, 1.5].forEach((z, r) => out.push({ x, z, yaw: Math.PI, monitors: 2, npc: (c + r) % 3 === 0 ? NPC_MODELS[(c + r) % 4] : undefined })));
  } else if (floor === 2) {
    [-5, -1, 3].forEach((x, c) => out.push({ x, z: -4, yaw: Math.PI, monitors: 2, npc: c === 1 ? "mage" : undefined }));
    out.push({ x: -8.6, z: 1.5, yaw: -Math.PI / 2, monitors: 2 });
  } else {
    out.push({ x: 0, z: -3.5, yaw: Math.PI, monitors: 2 });
  }
  return out;
}

export function OfficeFloor({ place, floor }: { place: Place; floor: number }) {
  const dept = place.department!;
  const color = DEPARTMENT_COLOR[dept];
  const style = TOWER_STYLE[dept];
  const profile = useClientStore((s) => s.profile);
  const mine = profile?.employee.department === dept ? profile : null;
  const myFloor = mine ? gradeFloor(mine.employee.grade) : -1;
  const coffee = useRef(0);
  const desks = useMemo(() => desksFor(floor), [floor]);
  const grade = GRADES[floor];

  const openBoard = useCallback(() => actions.openPanel("office", place.id), [place.id]);
  const openElevator = useCallback(() => sceneActions.openElevator(true), []);
  const brew = useCallback(() => {
    coffee.current = performance.now() + 3000;
    sceneActions.gesture("interact");
    sceneActions.say("coffee", ["☕ Готово! Капучино как у наставника.", "☕ Двойной эспрессо — к дедлайну.", "☕ Латте. +1 к настроению (в навыки не идёт)."][Math.floor(Math.random() * 3)]);
  }, []);

  const lead = floor === 3;
  const floorColor = lead ? "#c9b8a0" : floor === 2 ? "#d9d0c2" : "#dcd8d0";

  return (
    <Room w={W} d={D} floor={floorColor} wall={lead ? "#efe6d6" : "#f3f0ea"} exit={false} spawn={SPAWN} spawnYaw={0}>
      <SkylineWindow width={13} height={lead ? 2.7 : 2.2} y={lead ? 0.3 : 0.5} z={-D / 2 + 0.22} />

      {/* лифт и доска отдела */}
      <Elevator position={ELEVATOR} floorLabel={`${floor + 1} · ${grade}`} />
      <Blocker x={8.6} z={-7.6} r={1.2} />
      <Interactable id="elevator" label="Лифт: выбрать этаж" position={ELEVATOR_SPOT} radius={1.8} onInteract={openElevator} />
      <TextBoard position={[W / 2 - 0.25, 1.7, -2.5]} rotation={-Math.PI / 2} text="Доска отдела" sub={`${style.short} · этаж ${grade}`} color={color} width={3.2} height={1.3} />
      <Interactable id="board" label="Доска отдела" position={BOARD_SPOT} radius={1.8} onInteract={openBoard} />
      {myFloor === floor && (
        <TextBoard
          position={[5.4, 2.3, -D / 2 + 0.3]}
          text="Ваш этаж"
          sub={mine?.target ? `до ${mine.target.grade}: ${mine.gradeProgress.met} из ${mine.gradeProgress.total} требований` : `${mine?.employee.grade}`}
          color="#d4a017"
          width={3.4}
          height={1.1}
        />
      )}
      {myFloor === floor && <pointLight position={[5.4, 2.6, -D / 2 + 1.2]} color="#ffd27a" intensity={8} distance={7} decay={2} />}

      {/* рабочие места */}
      {desks.map((d, i) => (
        <Workplace key={i} d={d} i={i} headset={dept === "Customer Support" || dept === "Sales"} />
      ))}

      {/* кухонный угол с кофемашиной */}
      <group position={[-9.6, 0, 6.2]}>
        <Part size={[2.6, 0.9, 1.1]} color="#f4f1ea" flat={false} />
        <Part position={[0, 0.9, 0]} size={[2.7, 0.06, 1.2]} color="#7a6a5a" shadow={false} />
        <CoffeeMachine position={[-0.6, 0.96, 0]} active={coffee} />
        <Part geo="cyl" position={[0.5, 0.96, 0.1]} size={[0.07, 0.1, 0.07]} color="#ffffff" shadow={false} />
        <Part geo="cyl" position={[0.75, 0.96, -0.15]} size={[0.07, 0.1, 0.07]} color="#f4c95d" shadow={false} />
      </group>
      <Blocker x={-9.6} z={6.2} r={1.4} />
      <Interactable id="coffee" label="Кофемашина" position={COFFEE_SPOT} radius={1.6} onInteract={brew} />

      {lead ? <LeadSuite color={color} /> : <FloorDressing floor={floor} />}
      <DepartmentZone dept={dept} floor={floor} />
    </Room>
  );
}

/** лаунж и растения обычных этажей */
function FloorDressing({ floor }: { floor: number }) {
  return (
    <group>
      <Model url={FURNITURE.cactusA} position={[-10.2, 0, -7]} scale={1.1} />
      <Model url={FURNITURE.cactusB} position={[3.5, 0, -7]} scale={1} />
      {floor >= 1 && (
        <group>
          <Model url={FURNITURE.rugStripes} position={[-3, 0, 5.5]} scale={[1.4, 1, 1.2]} />
          <Model url={FURNITURE.couch} position={[-3, 0, 6.6]} scale={0.85} rotation={[0, Math.PI, 0]} />
          <Blocker x={-3} z={6.6} r={1.2} />
          <Model url={FURNITURE.tableLow} position={[-3, 0, 4.6]} scale={0.8} />
          <Blocker x={-3} z={4.6} r={0.9} />
          <Model url={FURNITURE.lampStanding} position={[-5.4, 0, 6.8]} scale={0.9} />
        </group>
      )}
      {floor === 2 && (
        <group>
          <Model url={FURNITURE.tableLong} position={[4, 0, 3.5]} scale={[1, 0.78, 0.9]} />
          <Blocker x={4} z={3.5} r={1.7} />
          {[-1, 0, 1].map((k) => (
            <Model key={k} url={FURNITURE.chairA} position={[4 + k * 1.1, 0, 4.9]} scale={0.85} rotation={[0, Math.PI, 0]} />
          ))}
          {[-1, 1].map((k) => (
            <Model key={k} url={FURNITURE.chairA} position={[4 + k * 1.1, 0, 2.1]} scale={0.85} />
          ))}
          <TextBoard position={[4, 1.7, 7.75]} rotation={Math.PI} text="Whiteboard" sub="архитектура · планы · ретро" color="#f4f4f2" width={4} height={1.4} />
        </group>
      )}
      {floor === 0 && <Model url={FURNITURE.shelfLarge} position={[-10.6, 1.5, 0]} scale={1} rotation={[0, Math.PI / 2, 0]} />}
    </group>
  );
}

/** пентхаус Lead: люстры, ковёр, большой стол, диванная группа, библиотека */
function LeadSuite({ color }: { color: string }) {
  return (
    <group>
      <Chandelier position={[-4, 3.1, -1]} radius={0.9} />
      <Chandelier position={[4, 3.1, -1]} radius={0.9} />
      <Chandelier position={[0, 3.1, 4]} radius={0.7} />
      <Model url={FURNITURE.rug} position={[0, 0, -2.5]} scale={[2.6, 1, 2]} />
      <Model url={FURNITURE.armchair} position={[0, 0, -5.9]} scale={0.85} />
      <Model url={FURNITURE.shelfLarge} position={[-10.6, 1.6, -3]} scale={1} rotation={[0, Math.PI / 2, 0]} />
      <Model url={FURNITURE.cabinet} position={[-10.3, 0, 1]} scale={1} rotation={[0, Math.PI / 2, 0]} />
      <Blocker x={-10.3} z={1} r={0.9} />
      <Model url={FURNITURE.rugRound} position={[-4.5, 0, 4.5]} scale={1.8} />
      <Model url={FURNITURE.couch} position={[-4.5, 0, 6.2]} scale={0.9} rotation={[0, Math.PI, 0]} />
      <SeatSpot id="lead-couch" position={[-4.5, 0, 6.2]} yaw={Math.PI} />
      <Blocker x={-4.5} z={6.4} r={1.3} />
      <Model url={FURNITURE.armchair} position={[-7.2, 0, 4.2]} scale={0.85} rotation={[0, Math.PI / 2, 0]} />
      <Model url={FURNITURE.armchair} position={[-1.8, 0, 4.2]} scale={0.85} rotation={[0, -Math.PI / 2, 0]} />
      <Blocker x={-7.2} z={4.2} r={0.7} />
      <Blocker x={-1.8} z={4.2} r={0.7} />
      <Model url={FURNITURE.tableLow} position={[-4.5, 0, 4.2]} scale={0.8} />
      <Blocker x={-4.5} z={4.2} r={0.9} />
      <Model url={FURNITURE.lampTable} position={[-9.8, 1.0, 1]} scale={0.8} />
      <Model url={FURNITURE.cactusA} position={[10, 0, 6.8]} scale={1.2} />
      <Model url={FURNITURE.cactusB} position={[-10, 0, -7]} scale={1.2} />
      <Model url={FURNITURE.pictureLarge} position={[3, 1.9, 7.75]} scale={1.2} rotation={[0, Math.PI, 0]} />
      <Part position={[0, 0, 7.4]} size={[6, 0.02, 0.6]} color={color} shadow={false} />
      <group position={[2.6, 0, 6.6]} rotation={[0, Math.PI + 0.6, 0]}>
        <Character model="barbarian" action="idle" phase={0.8} />
      </group>
      <Interactable id="lead-npc" label="Поговорить" position={[2.6, 0, 5.6]} radius={1.8} onInteract={() => sceneActions.say("lead-npc", "Lead — это не корона, а ответственность. Ну и люстры, конечно.")} />
    </group>
  );
}

/** узнаваемая зона отдела на правой половине этажа */
function DepartmentZone({ dept, floor }: { dept: Department; floor: number }) {
  const lead = floor === 3;
  switch (dept) {
    case "Backend Development":
      return (
        <group>
          {(lead ? [6.5, 8] : [5, 6.2, 7.4, 8.6]).map((x) =>
            (lead ? [2.5] : [1.5, 4.5]).map((z) => (
              <group key={`${x}-${z}`}>
                <ServerRack position={[x, 0, z]} seed={Math.round(x + z)} />
                <Blocker x={x} z={z} r={0.65} />
              </group>
            )),
          )}
          <Part position={[6.8, 0, 3]} size={[5.2, 0.02, 5]} color="#3a3f47" shadow={false} />
          {!lead && <pointLight position={[6.8, 1.5, 3]} color="#7fdcff" intensity={5} distance={7} decay={2} />}
          <TextBoard position={[W / 2 - 0.25, 1.7, 3]} rotation={-Math.PI / 2} text="Серверная" sub="uptime 99.97%" color="#2c4a6b" width={2.6} height={1} />
        </group>
      );
    case "Frontend Development":
      return (
        <group>
          <MoodBoard position={[W / 2 - 0.3, 1.6, 2.5]} rotation={-Math.PI / 2} width={4} />
          <Model url={FURNITURE.tableSmall} position={[7.5, 0, 2.5]} scale={0.8} />
          <Blocker x={7.5} z={2.5} r={0.8} />
          <Device position={[7.5, 0.82, 2.5]} w={0.36} h={0.26} rotation={0.3} />
          <Part position={[6.3, 0, 5.2]} size={[0.06, 1.9, 0.06]} color={PALETTE.wood} />
          <Part position={[5.9, 0, 5.4]} size={[0.06, 1.9, 0.06]} color={PALETTE.wood} />
          <MoodBoard position={[6.1, 1.5, 5.3]} rotation={0.4} width={1.4} />
          <Blocker x={6.1} z={5.3} r={0.7} />
          <Model url={FURNITURE.cactusA} position={[9.8, 0, 6.5]} scale={1} />
          <DashboardScreen position={[4.5, 1.9, -D / 2 + 0.28]} seed={4} width={2} />
        </group>
      );
    case "Data & Analytics":
      return (
        <group>
          {[0, 1, 2].map((c) =>
            [0, 1].map((r) => <DashboardScreen key={`${c}-${r}`} position={[W / 2 - 0.3, 2.35 - r * 1.15, 0.8 + c * 1.9]} seed={c + r * 3} width={1.7} rotation={-Math.PI / 2} />),
          )}
          <Model url={FURNITURE.tableLong} position={[7.6, 0, 2.6]} scale={[0.9, 0.78, 0.8]} />
          <Blocker x={7.6} z={2.6} r={1.5} />
          <Monitor position={[6.9, 0.78, 2.6]} rotation={-Math.PI / 2} wide />
          <Model url={FURNITURE.chairA} position={[6.2, 0, 2.6]} scale={0.85} rotation={[0, -Math.PI / 2, 0]} />
          <SeatSpot id="data-seat" position={[6.2, 0, 2.6]} yaw={Math.PI / 2} label="Сесть к дашбордам" />
          <pointLight position={[8.5, 2, 2.6]} color="#8fd3ff" intensity={4} distance={6} decay={2} />
        </group>
      );
    case "Quality Assurance":
      return (
        <group>
          <Model url={FURNITURE.tableLong} position={[7.2, 0, 3]} scale={[1.1, 0.78, 0.8]} />
          <Blocker x={7.2} z={3} r={1.8} />
          {[-1.4, -0.9, -0.4, 0.1].map((dx, i) => (
            <Device key={i} position={[7.2 + dx, 0.82, 2.7]} w={0.14} h={0.28} rotation={0.1 * i} />
          ))}
          <Device position={[8.0, 0.84, 2.9]} w={0.36} h={0.26} rotation={-0.2} />
          <Device position={[8.5, 0.84, 2.6]} w={0.3} h={0.2} rotation={0.2} />
          <Monitor position={[6.4, 0.78, 3.5]} rotation={Math.PI} />
          <TextBoard position={[W / 2 - 0.25, 1.7, 3]} rotation={-Math.PI / 2} text="Device Lab" sub="12 устройств · 3 бага в работе" color="#c9a14a" width={3} height={1.1} />
          <Part position={[6, 0, 6.2]} size={[3, 0.8, 0.5]} color={PALETTE.stone} />
          <Blocker x={6} z={6.2} r={1.5} />
          {[0, 1, 2].map((i) => (
            <Part key={i} position={[5 + i, 0.8, 6.2]} size={[0.5, 0.35, 0.35]} color={["#ef5350", "#ffb74d", "#66bb6a"][i]} shadow={false} />
          ))}
        </group>
      );
    case "Product Management":
      return (
        <group>
          <RoadmapWall position={[W / 2 - 0.3, 1.5, 1.5]} rotation={-Math.PI / 2} width={6} />
          <Model url={FURNITURE.tableMedium} position={[7.4, 0, 2]} scale={[0.9, 0.95, 0.9]} />
          <Blocker x={7.4} z={2} r={1.1} />
          <Model url={FURNITURE.stool} position={[6.3, 0, 2]} scale={0.9} />
          <Model url={FURNITURE.stool} position={[7.4, 0, 3.1]} scale={0.9} />
          <SeatSpot id="pm-stool" position={[6.3, 0, 2]} yaw={Math.PI / 2} />
          <Model url={FURNITURE.books} position={[7.4, 0.97, 2]} scale={0.7} />
          <Part position={[7.4, 0.95, 1.6]} size={[0.6, 0.02, 0.4]} color="#ffe066" shadow={false} />
        </group>
      );
    case "Human Resources":
      return (
        <group>
          <Model url={FURNITURE.rugRound} position={[7, 0, 2.5]} scale={2} />
          <Model url={FURNITURE.armchair} position={[5.4, 0, 2.5]} scale={0.85} rotation={[0, Math.PI / 2, 0]} />
          <Model url={FURNITURE.armchair} position={[8.6, 0, 2.5]} scale={0.85} rotation={[0, -Math.PI / 2, 0]} />
          <SeatSpot id="hr-arm-l" position={[5.4, 0, 2.5]} yaw={Math.PI / 2} />
          <SeatSpot id="hr-arm-r" position={[8.6, 0, 2.5]} yaw={-Math.PI / 2} />
          <Model url={FURNITURE.tableLow} position={[7, 0, 2.5]} scale={0.7} />
          <Blocker x={7} z={2.5} r={0.8} />
          <Model url={FURNITURE.cactusA} position={[9.9, 0, 0.2]} scale={1.2} />
          <Model url={FURNITURE.cactusB} position={[9.9, 0, 5]} scale={1.2} />
          <Model url={FURNITURE.cactusSmall} position={[7, 0.36, 2.5]} scale={0.7} />
          <Model url={FURNITURE.lampStanding} position={[4.6, 0, 5.8]} scale={0.9} />
          <Model url={FURNITURE.pictureMedium} position={[W / 2 - 0.25, 1.9, 2.5]} scale={1.2} rotation={[0, -Math.PI / 2, 0]} />
          <TextBoard position={[W / 2 - 0.25, 1.6, 6]} rotation={-Math.PI / 2} text="Лаунж" sub="говорим о людях, а не о цифрах" color="#b86b8f" width={2.8} height={1} />
          <group position={[8.6, 0, 2.5]} rotation={[0, -Math.PI / 2, 0]}>
            <Character model="knight" action="sit" phase={0.9} />
          </group>
        </group>
      );
    case "Sales":
      return (
        <group>
          <Model url={FURNITURE.shelfLarge} position={[W / 2 - 0.5, 1.5, 2.5]} scale={1.1} rotation={[0, -Math.PI / 2, 0]} />
          {[-0.7, -0.35, 0, 0.35, 0.7].map((dz, i) => (
            <Trophy key={i} position={[W / 2 - 0.5, 1.9, 2.5 + dz]} size={i === 2 ? 1.4 : 1} />
          ))}
          <TextBoard position={[W / 2 - 0.25, 2.75, 2.5]} rotation={-Math.PI / 2} text="Лучшие сделки" sub="Q3 · план 118%" color="#6f9f5a" width={2.8} height={0.7} />
          <Model url={FURNITURE.tableMedium} position={[7, 0, 5.4]} scale={[0.9, 0.78, 0.8]} />
          <Blocker x={7} z={5.4} r={1} />
          <Headset position={[6.6, 0.78, 5.2]} />
          <Headset position={[7.4, 0.78, 5.6]} />
          <Part position={[7, 0.78, 5.4]} size={[0.3, 0.12, 0.2]} color="#1c2028" shadow={false} />
          <TextBoard position={[7, 1.7, 7.75]} rotation={Math.PI} text="Колл-зона" sub="тише: идут звонки" color="#2f6f9f" width={3} height={1} />
        </group>
      );
    case "Customer Support":
      return (
        <group>
          <DashboardScreen position={[W / 2 - 0.3, 2.1, 2.5]} seed={5} width={2.2} rotation={-Math.PI / 2} />
          <TextBoard position={[W / 2 - 0.25, 0.95, 2.5]} rotation={-Math.PI / 2} text="Очередь: 3 · SLA 98%" color="#5b8fc9" width={2.8} height={0.5} />
          <Model url={FURNITURE.tableLong} position={[7, 0, 4.5]} scale={[0.9, 0.78, 0.8]} />
          <Blocker x={7} z={4.5} r={1.5} />
          {[-0.9, 0, 0.9].map((dx, i) => (
            <group key={i}>
              <Headset position={[7 + dx, 0.78, 4.2]} />
              <Monitor position={[7 + dx, 0.78, 4.8]} />
            </group>
          ))}
          {[-0.9, 0.9].map((dx, i) => (
            <group key={i}>
              <Model url={FURNITURE.chairA} position={[7 + dx, 0, 3.4]} scale={0.85} />
              <SeatSpot id={`sup-${i}`} position={[7 + dx, 0, 3.4]} yaw={0} label="Сесть на линию" />
            </group>
          ))}
          <Model url={FURNITURE.cactusA} position={[9.9, 0, 6.8]} scale={1} />
        </group>
      );
  }
}
