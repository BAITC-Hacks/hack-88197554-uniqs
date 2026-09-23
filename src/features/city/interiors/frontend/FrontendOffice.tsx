"use client";

import { useMemo, Suspense } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { Box3, MeshStandardMaterial, Shape, Vector3 } from "three";
import { actions } from "@/lib/client-store";
import { Part, Sign, textTexture } from "../../kit";
import { FURNITURE, useModel } from "../../models";
import { sceneActions } from "../../sceneState";
import { Blocker, ExitDoor, Interactable, SeatSpot, useRoomBounds } from "../Room";
import { FRONTEND_FLOORS, FRONTEND_ID, OUTLINE, frontendFloorIndex, type FrontendRoom, type Point2 } from "./layout";

const TEAL = "#447c74";
const OAK = "#c9b58e";
const INK = "#44534f";
const GLASS = new MeshStandardMaterial({ color: "#bbd7d4", transparent: true, opacity: 0.26, roughness: 0.3, depthWrite: false });
const roomColors = { meeting: "#cbded6", work: "#d7dfc8", lounge: "#e6d4b3", reception: "#e4dbc5", kitchen: "#e2d1ae", server: "#bdcfd5", classroom: "#d3dec5", security: "#cbd6ca", director: "#dfd4b9" };

function walk(e: ThreeEvent<PointerEvent>) {
  if (e.button !== 0) return;
  e.stopPropagation();
  actions.walkTo([e.point.x, e.point.z]);
}

function Floor({ points, color, y = 0 }: { points: Point2[]; color: string; y?: number }) {
  const shape = useMemo(() => {
    const s = new Shape();
    points.forEach(([x, z], index) => index === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z));
    s.closePath();
    return s;
  }, [points]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow onPointerDown={walk}>
    <shapeGeometry args={[shape]} /><meshStandardMaterial color={color} roughness={0.92} />
  </mesh>;
}

/** Low cutaway walls keep all rooms visible. Collision remains at full plan perimeter. */
function Wall({ a, b, exterior = false }: { a: Point2; b: Point2; exterior?: boolean }) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, yaw = -Math.atan2(dz, dx);
  const count = Math.ceil(length / 0.5);
  return <>
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <Part size={[length, 0.65, 0.18]} color={exterior ? "#86978f" : "#adb7a6"} />
      <Part position={[0, 0.65, 0]} size={[length, 0.07, 0.23]} color="#faf8ef" shadow={false} />
      <Part position={[0, 0.72, 0]} size={[length, exterior ? 1 : 0.63, 0.06]} material={GLASS} shadow={false} />
      <Part position={[0, exterior ? 1.72 : 1.35, 0]} size={[length, 0.05, 0.09]} color="#a3b3ad" shadow={false} />
      {Array.from({ length: Math.ceil(length / 3) + 1 }, (_, i) => <Part key={i} position={[-length / 2 + i * length / Math.ceil(length / 3), 0.65, 0]} size={[0.055, exterior ? 1.1 : 0.75, 0.11]} color="#a3b3ad" shadow={false} />)}
    </group>
    {Array.from({ length: count + 1 }, (_, i) => <Blocker key={i} x={a[0] + dx * i / count} z={a[1] + dz * i / count} r={0.16} />)}
  </>;
}

function DoorWall({ a, b, exterior = false }: { a: Point2; b: Point2; exterior?: boolean }) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const mix = (t: number): Point2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const p = mix(0.5 - 1.45 / length), q = mix(0.5 + 1.45 / length);
  return <><Wall a={a} b={p} exterior={exterior} /><Wall a={q} b={b} exterior={exterior} />
    {[p, q].map(([x, z], i) => <Part key={i} position={[x, 0, z]} size={[0.14, 1.5, 0.14]} color={TEAL} />)}
  </>;
}

function Label({ text, x, z, width = 5.5, color = "#edf0e9" }: { text: string; x: number; z: number; width?: number; color?: string }) {
  const texture = useMemo(() => textTexture(text, { bg: color, fg: INK, width: 768, height: 120 }), [text, color]);
  return <mesh position={[x, 0.065, z]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={walk}>
    <planeGeometry args={[width, 0.95]} /><meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}

function Model({ url, x, z, height, yaw = 0 }: { url: string; x: number; z: number; height: number; yaw?: number }) {
  const object = useModel(url);
  const fit = useMemo(() => {
    const b = new Box3().setFromObject(object), size = b.getSize(new Vector3()), c = b.getCenter(new Vector3());
    return { scale: height / Math.max(0.01, size.y), offset: [-c.x, -b.min.y, -c.z] as [number, number, number] };
  }, [object, height]);
  return <group position={[x, 0, z]} rotation={[0, yaw, 0]} scale={fit.scale}><primitive object={object} position={fit.offset} /></group>;
}

function Chair({ x, z, yaw = Math.PI, id }: { x: number; z: number; yaw?: number; id: string }) {
  return <><Suspense fallback={null}><Model url={FURNITURE.chairA} x={x} z={z} height={0.95} yaw={yaw} /></Suspense><SeatSpot id={id} position={[x, 0, z]} yaw={yaw} /></>;
}

function Plant({ x, z }: { x: number; z: number }) {
  return <>
    <Part geo="cyl8" position={[x, 0, z]} size={[0.38, 0.6, 0.38]} color="#e9e1cf" />
    <Part geo="cyl8" position={[x, 0.58, z]} size={[0.34, 0.04, 0.34]} color="#665b44" />
    {[-1, 0, 1].map((i) => <Part key={i} geo="ico" position={[x + i * 0.2, 0.75 + (i === 0 ? 0.35 : 0), z + i * 0.16]} size={[0.36, 0.48, 0.32]} color={i === 0 ? "#608867" : "#88a478"} />)}
    <Blocker x={x} z={z} r={0.42} />
  </>;
}

function Table({ x, z, w = 2.7, d = 1.25 }: { x: number; z: number; w?: number; d?: number }) {
  const cols = Math.ceil(w / 0.65), rows = Math.ceil(d / 0.65);
  return <>
    <Part position={[x, 0.8, z]} size={[w, 0.12, d]} color={OAK} />
    {[-1, 1].flatMap((a) => [-1, 1].map((b) => <Part key={`${a}${b}`} position={[x + a * (w / 2 - 0.16), 0, z + b * (d / 2 - 0.16)]} size={[0.09, 0.8, 0.09]} color="#8b968e" />))}
    {Array.from({ length: cols }, (_, i) => Array.from({ length: rows }, (_, j) => <Blocker key={`${i}:${j}`} x={x - w / 2 + (i + 0.5) * w / cols} z={z - d / 2 + (j + 0.5) * d / rows} r={0.35} />))}
  </>;
}

function Desk({ x, z, id }: { x: number; z: number; id: string }) {
  return <>
    <Table x={x} z={z} w={2.4} d={1.15} />
    <Part position={[x, 0.92, z - 0.22]} size={[0.08, 0.24, 0.09]} color={INK} />
    <Part position={[x, 1.1, z - 0.25]} size={[0.9, 0.52, 0.075]} color={INK} />
    <Part position={[x, 1.14, z - 0.205]} size={[0.81, 0.43, 0.018]} color="#aac8c3" emissive="#c3ded4" intensity={0.15} shadow={false} />
    <Part position={[x, 0.93, z + 0.22]} size={[0.66, 0.03, 0.22]} color="#e3e6de" />
    <Part geo="cyl8" position={[x + 0.9, 0.93, z + 0.1]} size={[0.09, 0.18, 0.09]} color="#eee8d8" />
    <Chair x={x} z={z + 1} id={id} />
  </>;
}

function Meeting({ x, z, large, vertical, id }: { x: number; z: number; large?: boolean; vertical?: boolean; id: string }) {
  const length = large ? 8 : 4.8;
  return <>
    <Table x={x} z={z} w={vertical ? 2.4 : length} d={vertical ? length : 2.4} />
    {[-1, 1].flatMap((side) => Array.from({ length: large ? 5 : 3 }, (_, i) => {
      const offset = (i - (large ? 2 : 1)) * 1.45;
      return <Chair key={`${side}:${i}`} id={`${id}-${side}-${i}`} x={x + (vertical ? side * 2 : offset)} z={z + (vertical ? offset : side * 2)} yaw={vertical ? -side * Math.PI / 2 : side > 0 ? Math.PI : 0} />;
    }))}
    <Part position={[x, 0.93, z]} size={[0.8, 0.025, 0.55]} color="#f8f6ec" />
  </>;
}

function Lounge({ x, z }: { x: number; z: number }) {
  return <>
    <Part position={[x, 0.02, z]} size={[4.2, 0.025, 3.8]} color="#d9cbb1" shadow={false} />
    <Suspense fallback={null}>
      <Model url={FURNITURE.couch} x={x} z={z - 1.1} height={1.05} />
      <Model url={FURNITURE.armchair} x={x - 1.5} z={z + 1.1} height={0.95} yaw={Math.PI * 0.65} />
      <Model url={FURNITURE.tableLow} x={x + 0.6} z={z + 0.5} height={0.45} />
    </Suspense>
    <Blocker x={x} z={z - 1.1} r={1.2} />
  </>;
}

function Kitchen({ x, z, compact }: { x: number; z: number; compact?: boolean }) {
  return <>
    <Part position={[x, 0, z - 1.3]} size={[compact ? 2.6 : 4.7, 1.05, 0.75]} color="#bdc5b4" />
    <Part position={[x, 1.05, z - 1.3]} size={[compact ? 2.7 : 4.8, 0.1, 0.85]} color="#f7f3e6" />
    <Part position={[x + 0.65, 1.15, z - 1.3]} size={[0.55, 0.55, 0.5]} color={INK} />
    <Part position={[x - 0.7, 1.16, z - 1.3]} size={[0.65, 0.03, 0.45]} color="#94a9a5" />
    <Blocker x={x} z={z - 1.3} r={1.2} />
    <Part geo="cyl" position={[x, 0.78, z + 1.3]} size={[0.9, 0.12, 0.9]} color={OAK} />
    <Part geo="cyl8" position={[x, 0, z + 1.3]} size={[0.12, 0.78, 0.12]} color={INK} />
    <Blocker x={x} z={z + 1.3} r={0.9} />
    <Chair x={x - 1.35} z={z + 1.3} yaw={Math.PI / 2} id={`coffee-${x}-${z}-1`} />
    <Chair x={x + 1.35} z={z + 1.3} yaw={-Math.PI / 2} id={`coffee-${x}-${z}-2`} />
  </>;
}

function Contents({ room }: { room: FrontendRoom }) {
  const [x, z] = room.center;
  if (room.kind === "meeting") return <Meeting x={x} z={z} large={room.id === "east" || room.polygon[1][0] - room.polygon[0][0] > 12} vertical={room.id === "east"} id={room.id} />;
  if (room.kind === "lounge") return <Lounge x={x} z={z} />;
  if (room.kind === "kitchen") return <Kitchen x={x} z={z} compact={room.id === "se"} />;
  if (room.kind === "work") {
    const rows = room.id === "east" || room.id === "sales" || room.id === "clients" ? [-4.5, 0, 4.5] : [0];
    const columns = room.id === "nw" ? [0] : [-1.7, 1.7];
    return <>{rows.flatMap((dz, i) => columns.map((dx, j) => <Desk key={`${i}:${j}`} x={x + dx} z={z + dz - 0.6} id={`${room.id}-${i}-${j}`} />))}</>;
  }
  if (room.kind === "security" || room.kind === "director") return <><Desk x={x} z={z - 0.5} id={room.id} /><Chair x={x + 1} z={z - 1.8} yaw={0} id={`${room.id}-guest`} /></>;
  if (room.kind === "server") return <>{[-1.6, 1.6].map((dx) => <group key={dx}>
    <Part position={[x + dx, 0, z + 0.4]} size={[1.2, 2.05, 1.15]} color="#4c5b60" />
    {Array.from({ length: 6 }, (_, i) => <group key={i}>
      <Part position={[x + dx, 0.2 + i * 0.28, z + 0.985]} size={[1, 0.18, 0.025]} color="#84918f" shadow={false} />
      <Part position={[x + dx + 0.34, 0.25 + i * 0.28, z + 1.01]} size={[0.07, 0.06, 0.02]} color="#9cdfba" emissive="#5ef4b1" intensity={0.5} shadow={false} />
    </group>)}<Blocker x={x + dx} z={z + 0.4} r={0.8} />
  </group>)}</>;
  if (room.kind === "classroom") return <>
    {[-5.1, -1.7, 1.7, 5.1].flatMap((dx, i) => [0, 2.1].map((dz, j) => <group key={`${i}:${j}`}><Table x={x + dx} z={z + dz - 0.5} w={1.8} d={0.85} /><Chair x={x + dx} z={z + dz + 0.35} id={`class-${i}-${j}`} /></group>))}
    <Part position={[x, 0.1, 12.3]} size={[5.5, 1.5, 0.12]} color={TEAL} />
  </>;
  return <>
    <Part position={[x, 0, z - 0.2]} size={[6.5, 1.05, 1.05]} color={TEAL} />
    <Part position={[x, 1.05, z - 0.2]} size={[6.8, 0.12, 1.2]} color={OAK} />
    {[-2.6, -1.3, 0, 1.3, 2.6].map((dx) => <Blocker key={dx} x={x + dx} z={z - 0.2} r={0.65} />)}
    <Sign text="FRONTEND" color={TEAL} width={3.2} height={0.45} position={[x, 0.7, z + 0.4]} />
    <Suspense fallback={null}><Model url={FURNITURE.couch} x={-5} z={16.5} height={1} yaw={Math.PI / 2} /><Model url={FURNITURE.couch} x={5} z={16.5} height={1} yaw={-Math.PI / 2} /></Suspense>
    <Interactable id="frontend-reception" label="Карьерная траектория" position={[0, 0, 15.2]} onInteract={() => actions.openPanel("office", FRONTEND_ID)} />
  </>;
}

function Stairs({ x, z, peripheral = false }: { x: number; z: number; peripheral?: boolean }) {
  return <>
    {Array.from({ length: 9 }, (_, i) => <Part key={i} position={[x, 0, z - 2.2 + i * 0.5]} size={[2.1, 0.12 + i * 0.1, 0.5]} color={i % 2 ? "#d5d7cd" : "#e9e8dd"} />)}
    {[-1.15, 1.15].map((dx) => <Part key={dx} position={[x + dx, 0.65, z]} size={[0.06, 0.5, 4.8]} color="#9aa69d" shadow={false} />)}
    {[-1.5, 0, 1.5].map((dz) => <Blocker key={dz} x={x} z={z + dz} r={1.1} />)}
    <Label text="Лестница" x={x} z={z + 3} width={3.2} />
    <Interactable id={`frontend-stairs-${peripheral ? "outer" : "core"}`} label="Лестница: выбрать этаж" position={[x, 0, z + 3.2]} radius={1.7} onInteract={() => sceneActions.openElevator(true)} />
  </>;
}

function Core({ floor }: { floor: number }) {
  return <>
    <Floor points={[[-7, -6.5], [5.5, -6.5], [5.5, 8.5], [-7, 8.5]]} color="#c5cfc0" y={0.025} />
    <Wall a={[-7, -6.5]} b={[5.5, -6.5]} />
    <Wall a={[-7, -6.5]} b={[-7, 0]} /><DoorWall a={[-7, 0]} b={[-7, 8.5]} />
    <Wall a={[-7, 8.5]} b={[-2.7, 8.5]} /><Wall a={[-2.7, -6.5]} b={[-2.7, 8.5]} />
    {[-4.8, -1.8, 1.2, 4.2].map((z) => <group key={z}>
      <Part position={[-5, 0, z - 1.3]} size={[3.5, 0.75, 0.1]} color="#f4f3e8" />
      <Part position={[-5.4, 0, z]} size={[0.85, 0.48, 0.7]} color="#f9f8f0" />
      <Part position={[-5.8, 0.45, z]} size={[0.35, 0.4, 0.7]} color="#fffdf3" />
      <Blocker x={-5.4} z={z} r={0.65} />
    </group>)}
    <Label text="Санузлы" x={-4.9} z={7.4} width={3.3} />
    <Stairs x={-0.9} z={1.1} />
    {[-4, 0.1, 4.2].map((z, i) => <group key={z}>
      <Part position={[3.1, 0, z]} size={[3.6, 1.45, 3.7]} color="#7e9288" />
      <Part position={[3.1, 1.45, z]} size={[3.8, 0.1, 3.9]} color="#99aa9d" />
      <Part position={[4.94, 0.08, z]} size={[0.04, 1.25, 2.9]} color="#91a3a0" />
      <Part position={[4.97, 0.08, z]} size={[0.03, 1.3, 0.035]} color={INK} shadow={false} />
      <Part position={[5.03, 1.02, z + 1.65]} size={[0.06, 0.25, 0.15]} color= {TEAL} emissive={TEAL} intensity={0.35} />
      <Blocker x={3.1} z={z} r={2.1} />
      <Interactable id={`frontend-lift-${floor}-${i}`} label={`Лифт · сейчас ${floor + 1} этаж`} position={[6.9, 0, z]} radius={1.55} onInteract={() => sceneActions.openElevator(true)} />
    </group>)}
    <Label text="Лифты" x={3.1} z={7.8} width={3.5} />
  </>;
}

export function FrontendOffice({ floor: sceneFloor }: { floor: number }) {
  const floor = frontendFloorIndex(sceneFloor);
  const plan = FRONTEND_FLOORS[floor];
  useRoomBounds(19, 19, floor === 0 ? 0 : 7.8, floor === 0 ? 17.5 : 4.2, Math.PI);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}><planeGeometry args={[160, 160]} /><meshStandardMaterial color="#cbd4cf" /></mesh>
    <Floor points={OUTLINE} color="#f1eee3" />
    {OUTLINE.map((a, index) => {
      const b = OUTLINE[(index + 1) % OUTLINE.length];
      return floor === 0 && index === 4 ? <DoorWall key={index} a={a} b={b} exterior /> : <Wall key={index} a={a} b={b} exterior />;
    })}
    {plan.rooms.map((room) => <group key={room.id}>
      <Floor points={room.polygon} color={roomColors[room.kind]} y={0.02} />
      {room.walls.map((edge) => {
        const a = room.polygon[edge], b = room.polygon[(edge + 1) % room.polygon.length];
        return room.doors.includes(edge) ? <DoorWall key={edge} a={a} b={b} /> : <Wall key={edge} a={a} b={b} />;
      })}
      <Contents room={room} />
      <Label text={room.name} x={room.label[0]} z={room.label[1]} color={roomColors[room.kind]} width={room.name.length > 14 ? 6.5 : 5.3} />
    </group>)}
    <Core floor={floor} />
    <Stairs x={-10.5} z={14.8} peripheral />
    {[[-8, -17.8], [8, -17.8], [-17.5, -6], [17.5, 9], [-7, 17.5], [7, 17.5], [9.2, -8.4]].map(([x, z], i) => <Plant key={i} x={x} z={z} />)}
    <Label text="ОБЩИЙ ХОЛЛ" x={0} z={-8.5} width={6.5} />
    <Label text={`${String(floor + 1).padStart(2, "0")}  /  ${plan.name.toUpperCase()}`} x={0} z={10} width={7} color="#e4e8dc" />
    {floor === 0 && <ExitDoor z={19} />}
  </group>;
}
