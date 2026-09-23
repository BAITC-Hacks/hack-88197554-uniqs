"use client";

import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { actions } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { Part, Sign, textTexture } from "../../kit";
import { sceneActions } from "../../sceneState";
import { ExitDoor, Interactable, useRoomBounds } from "../Room";
import { BACKEND_FLOORS, DEPTH, WIDTH, backendFloorIndex, officeTitle, type BackendRoom } from "./layout";
import { Chair, Desk, GREEN, INK, Lounge, Meeting, Plant, Solid, Table, WOOD } from "./furniture";

type Point = [number, number];
const PAPER = "#f1eee4";
const WALL = "#d9ddd4";

function walk(event: ThreeEvent<PointerEvent>) {
  if (event.button !== 0) return;
  event.stopPropagation();
  actions.walkTo([event.point.x, event.point.z]);
}

function Label({ text, x, z, w = 5.4, color = PAPER }: { text: string; x: number; z: number; w?: number; color?: string }) {
  const texture = useMemo(() => textTexture(text, { bg: color, fg: INK, width: 768, height: 128 }), [text, color]);
  return <mesh position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={walk}>
    <planeGeometry args={[w, 0.82]} /><meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

function Wall({ a, b, exterior = false }: { a: Point; b: Point; exterior?: boolean }) {
  const w = Math.max(0.18, Math.abs(b[0] - a[0])), d = Math.max(0.18, Math.abs(b[1] - a[1]));
  const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
  return <>
    <Part position={[x, 0, z]} size={[w, exterior ? 1.2 : 0.82, d]} color={exterior ? "#afbdb2" : WALL} />
    <Part position={[x, exterior ? 1.2 : 0.82, z]} size={[w + 0.06, 0.08, d + 0.06]} color="#faf7ee" shadow={false} />
    <Solid x={x} z={z} w={w} d={d} />
  </>;
}

function DoorWall({ a, b }: { a: Point; b: Point }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const mix = (t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const p = mix(0.5 - 1.3 / len), q = mix(0.5 + 1.3 / len);
  return <>
    <Wall a={a} b={p} /><Wall a={q} b={b} />
    {[p, q].map(([x, z], i) => <Part key={i} position={[x, 0, z]} size={[0.13, 1.12, 0.13]} color={GREEN} />)}
  </>;
}

function Enclosure({ room }: { room: BackendRoom }) {
  const [l, t, r, b] = room.rect;
  const sides: { name: string; a: Point; b: Point }[] = [
    { name: "north", a: [l, t], b: [r, t] }, { name: "south", a: [l, b], b: [r, b] },
    { name: "west", a: [l, t], b: [l, b] }, { name: "east", a: [r, t], b: [r, b] },
  ];
  const color = room.kind === "stairs" || room.kind === "wc" || room.kind === "lift" ? "#dce1db" : room.kind === "lounge" || room.kind === "kitchen" || room.kind === "coffee" ? "#e9dfcb" : PAPER;
  return <>
    <Part position={[(l + r) / 2, 0.008, (t + b) / 2]} size={[r - l, 0.018, b - t]} color={color} shadow={false} />
    {sides.filter((s) => !(s.a[0] === s.b[0] && Math.abs(s.a[0]) === WIDTH / 2) && !(s.a[1] === s.b[1] && Math.abs(s.a[1]) === DEPTH / 2)).map((s) => s.name === room.door ? <DoorWall key={s.name} a={s.a} b={s.b} /> : <Wall key={s.name} a={s.a} b={s.b} />)}
    <Label text={room.name} x={(l + r) / 2} z={t + 0.8} w={Math.min(r - l - 0.7, 6.5)} color={color} />
  </>;
}

function Staircase({ room }: { room: BackendRoom }) {
  const [l, t, r, b] = room.rect, x = (l + r) / 2, z = (t + b) / 2 + 0.3;
  return <>
    {[-1.15, 1.15].map((dx, wing) => <group key={dx}>
      {Array.from({ length: 9 }, (_, i) => <Part key={i} position={[x + dx, 0, z - 1.8 + i * 0.43]} size={[1.95, 0.14 + (wing ? 8 - i : i) * 0.14, 0.43]} color={i % 2 ? "#c5cdc4" : "#e0e3d8"} />)}
      <Solid x={x + dx} z={z} w={1.95} d={3.9} />
    </group>)}
    <Part position={[x, 0, z]} size={[0.1, 1.4, 4]} color={INK} />
    <Interactable id={`backend-${room.id}`} label="Лестница · выбрать этаж" position={room.door === "east" ? [r + 0.9, 0, z - 0.3] : [x, 0, b + 0.9]} radius={1.7} onInteract={() => sceneActions.openElevator(true)} />
  </>;
}

function Kitchen({ x, z, coffee = false }: { x: number; z: number; coffee?: boolean }) {
  return <>
    <Part position={[x + 3.6, 0, z]} size={[1.1, 1, 4.8]} color="#a6b79c" />
    <Part position={[x + 3.6, 1, z]} size={[1.2, 0.1, 4.9]} color="#f7f5e9" />
    <Solid x={x + 3.6} z={z} w={1.1} d={4.8} />
    <Part position={[x + 3.6, 1.12, z - 1.35]} size={[0.65, 0.05, 0.8]} color="#94a8a3" />
    <Part position={[x + 3.6, 1.12, z + 0.2]} size={[0.62, 0.62, 0.5]} color={INK} />
    <Part position={[x + 3.6, 0, z + 2.85]} size={[1.25, 2, 1.1]} color="#e7e8e1" />
    <Solid x={x + 3.6} z={z + 2.85} w={1.25} d={1.1} />
    {coffee ? <><Lounge x={x - 1.3} z={z - 0.6} /><Plant x={x - 3.7} z={z - 2.6} /></> : <Meeting x={x - 0.6} z={z + 0.5} id="kitchen" />}
  </>;
}

function RoomContents({ room, floor }: { room: BackendRoom; floor: number }) {
  const [l, t, r, b] = room.rect, x = (l + r) / 2, z = (t + b) / 2 + 0.5;
  if (room.kind === "stairs") return <Staircase room={room} />;
  if (room.kind === "lift") return <>
    <Part position={[x, 0, t + 1.3]} size={[3.35, 2.7, 0.28]} color={INK} />
    {[-0.77, 0.77].map((dx) => <Part key={dx} position={[x + dx, 0, t + 1.48]} size={[1.49, 2.4, 0.12]} color="#bac7c1" />)}
    <Sign text={`${floor + 1}  ↑ ↓`} color={INK} width={1.1} height={0.35} position={[x, 2.42, t + 1.58]} />
    <Solid x={x} z={t + 1.3} w={3.35} d={0.3} />
    <Interactable id="backend-elevator" label="Лифт · выбрать этаж" position={[x, 0, b + 0.7]} radius={2} onInteract={() => sceneActions.openElevator(true)} />
  </>;
  if (room.kind === "wc") return <>
    {[-1.4, 1.4].map((dx) => <group key={dx}>
      <Part position={[x + dx, 0, t + 2.1]} size={[1.7, 0.9, 1.65]} color="#fafbf2" />
      <Part geo="cyl" position={[x + dx, 0.65, t + 2.4]} size={[0.43, 0.1, 0.58]} color="#c0d0cb" />
      <Solid x={x + dx} z={t + 2.1} w={1.7} d={1.65} />
    </group>)}
    <Wall a={[x, t]} b={[x, t + 4]} />
    <Part position={[x - 1.7, 0.75, b - 1.5]} size={[1.2, 0.2, 0.7]} color="#f8f8ee" />
  </>;
  if (room.kind === "kitchen" || room.kind === "coffee") return <Kitchen x={x} z={z - 0.5} coffee={room.kind === "coffee"} />;
  if (room.kind === "meeting" || room.kind === "round") return <><Meeting x={x} z={z} id={room.id} large={room.id === "boardroom"} round={room.kind === "round"} /><Plant x={r - 1.2} z={t + 1.4} /></>;
  if (room.kind === "lounge") return <><Lounge x={x} z={z} /><Plant x={r - 1.1} z={b - 1.3} /></>;
  if (room.kind === "work") return <>
    {[-2.1, 2.1].flatMap((dx, i) => (room.id === "legal" ? [-1.6, 1.8] : [0]).map((dz, j) => <Desk key={`${i}-${j}`} x={x + dx} z={z + dz} id={`${room.id}-${i}-${j}`} />))}
    {b - t > 6 && <Plant x={l + 1.1} z={t + 1.2} />}
  </>;
  if (room.kind === "security" || room.kind === "director") return <>
    <Desk x={x} z={z - 0.3} id={room.id} />
    {room.kind === "director" && <><Chair x={x - 1.2} z={z - 2} yaw={0} id="director-guest" /><Plant x={l + 1.1} z={t + 1.3} /></>}
  </>;
  if (room.kind === "conference") return <>
    <Part position={[r - 0.5, 0.6, z]} size={[0.12, 2, 6.5]} color={INK} />
    {Array.from({ length: 5 }, (_, i) => Array.from({ length: 4 }, (_, j) => <Chair key={`${i}-${j}`} id={`conf-${i}-${j}`} x={l + 3 + i * 1.7} z={t + 2.2 + j * 1.8} yaw={Math.PI / 2} interactive={false} />))}
  </>;
  if (room.kind === "wardrobe") return <>
    {[-1.6, 1.6].map((dx) => <group key={dx}>
      <Part position={[x + dx, 0, z]} size={[0.1, 1.9, 3.1]} color={INK} />
      {[-0.9, 0, 0.9].map((dz) => <Part key={dz} position={[x + dx, 0.5, z + dz]} size={[0.85, 1.25, 0.16]} color={dx < 0 ? "#a4b2a0" : "#c6b594"} />)}
      <Solid x={x + dx} z={z} w={0.9} d={3.1} />
    </group>)}
  </>;
  if (room.kind === "server") return <>
    {[-2.5, 0, 2.5].map((dx) => <group key={dx}>
      <Part position={[x + dx, 0, z]} size={[1.3, 2.1, 1.15]} color={INK} />
      {Array.from({ length: 6 }, (_, i) => <group key={i}>
        <Part position={[x + dx, 0.2 + i * 0.29, z + 0.59]} size={[1.1, 0.17, 0.04]} color="#7c918b" shadow={false} />
        <Part position={[x + dx + 0.4, 0.25 + i * 0.29, z + 0.62]} size={[0.08, 0.05, 0.03]} color="#9de5bb" emissive="#61f99f" intensity={0.5} shadow={false} />
      </group>)}
      <Solid x={x + dx} z={z} w={1.3} d={1.15} />
    </group>)}
  </>;
  return <>
    {[-4.8, -1.6, 1.6, 4.8].flatMap((dx, i) => [0, 2.3, 4.6].map((dz, j) => <group key={`${i}-${j}`}>
      <Table x={x + dx} z={t + 2.3 + dz} w={1.65} d={0.7} /><Chair x={x + dx} z={t + 3.2 + dz} id={`class-${i}-${j}`} />
    </group>))}
    <Sign text="АКАДЕМИЯ · CAREER QUEST" color={GREEN} width={5.8} height={1.1} position={[x, 1.3, t + 0.2]} />
    <Interactable id="backend-learning" label="Открыть обучение" position={[-9.4, 0, z - 0.5]} radius={1.5} onInteract={() => actions.openPanel("venue", "venue-course")} />
  </>;
}

function Reception({ place }: { place: Place }) {
  return <>
    <Label text="Ресепшен" x={-1} z={-2.8} w={6} />
    <Part position={[-1, 0.01, 0.5]} size={[9, 0.03, 5]} color="#e0d7c5" shadow={false} />
    <Part position={[-1, 0, 0.5]} size={[6, 1.08, 1.3]} color={GREEN} />
    <Part position={[-1, 1.08, 0.5]} size={[6.2, 0.12, 1.5]} color={WOOD} />
    <Solid x={-1} z={0.5} w={6.2} d={1.5} />
    <Sign text={officeTitle(place).toUpperCase()} color={GREEN} width={4.5} height={0.45} position={[-1, 0.45, 1.17]} />
    <Chair id="reception" x={-1} z={-0.9} yaw={0} />
    <Plant x={4.8} z={1} />
    <Label text="Ожидание" x={-1} z={5.3} />
    <Lounge x={-1} z={9} />
    <Plant x={-7} z={11.8} /><Plant x={5.2} z={11.8} />
    <Interactable id={`${place.id}-reception`} label="Карьерная траектория" position={[-1, 0, 2.5]} radius={1.9} onInteract={() => actions.openPanel("office", place.id)} />
  </>;
}

export function BackendOffice({ floor, place }: { floor: number; place: Place }) {
  const index = backendFloorIndex(floor), plan = BACKEND_FLOORS[index];
  useRoomBounds(WIDTH / 2, DEPTH / 2, floor === -1 ? 0 : -1.6, floor === -1 ? 13.4 : -5.2, Math.PI);
  return <group>
    <Part position={[0, -0.32, 0]} size={[WIDTH + 0.5, 0.3, DEPTH + 0.5]} color="#aab9ac" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={walk}>
      <planeGeometry args={[WIDTH, DEPTH]} /><meshStandardMaterial color="#ede9df" roughness={0.9} />
    </mesh>
    {Array.from({ length: 21 }, (_, i) => <Part key={i} position={[-20 + i * 2, 0.004, 0]} size={[0.012, 0.007, DEPTH]} color="#dad6ca" shadow={false} />)}
    <Wall a={[-21, -15]} b={[21, -15]} exterior /><Wall a={[-21, -15]} b={[-21, 15]} exterior /><Wall a={[21, -15]} b={[21, 15]} exterior />
    {index === 0 ? <><Wall a={[-21, 15]} b={[-1.7, 15]} exterior /><Wall a={[1.7, 15]} b={[21, 15]} exterior /><ExitDoor z={15} /></> : <Wall a={[-21, 15]} b={[21, 15]} exterior />}
    {[-17, -11, -6, 4, 9, 16].flatMap((x) => [-15, 15].map((z) => <group key={`${x}-${z}`}>
      <Part position={[x, 1.28, z]} size={[2.9, 0.8, 0.07]} color="#bbd6d1" shadow={false} />
      <Part position={[x, 1.28, z]} size={[0.07, 0.8, 0.12]} color="#eff4e9" shadow={false} />
    </group>))}
    {plan.rooms.map((room) => <group key={room.id}><Enclosure room={room} /><RoomContents room={room} floor={index} /></group>)}
    {index === 0 && <Reception place={place} />}
    {(index === 1 || index === 2) && <>
      <Part position={[0, 0.012, 5]} size={[20, 0.02, 18.8]} color="#e0e6db" shadow={false} />
      <Label text={index === 1 ? "Рабочая зона" : "Разработка"} x={0} z={-3.3} w={8} color="#e0e6db" />
      {[-6.6, 0, 6.6].flatMap((x, i) => Array.from({ length: 5 }, (_, j) => [-1, 1].map((side) => <Desk key={`${i}-${j}-${side}`} x={x + side * 0.55} z={-0.5 + j * 3.1} yaw={side * Math.PI / 2} id={`open-${i}-${j}-${side}`} />)))}
      <Plant x={-10.6} z={-3.9} /><Plant x={10.6} z={13.6} />
    </>}
  </group>;
}
