"use client";

// Мебель, палитра и низкие перегородки перенесены из OfficeWorld Елнура
// (codex/office a3bab6e, prototypes/office/src/scene.js) в существующую R3F-сцену.
// Сохраняем только интерьер: без второго renderer, внешнего кампуса и multiplayer.
import { Suspense, useMemo } from "react";
import { Box3, Vector3 } from "three";
import { actions } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { panelForPlace } from "@/lib/world";
import { Part, Sign } from "../kit";
import { FURNITURE, useModel } from "../models";
import { Blocker, Interactable, Room, SeatSpot } from "./Room";
import { officePlanFor, type OfficeZone } from "./officePlans";

type Point = [number, number, number];
const WOOD = "#c4966d";
const INK = "#596f67";

function FurnitureModel({ url, position, height, yaw = 0 }: { url: string; position: Point; height: number; yaw?: number }) {
  const object = useModel(url);
  const fit = useMemo(() => {
    const bounds = new Box3().setFromObject(object);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    return { scale: height / Math.max(0.03, size.y), offset: [-center.x, -bounds.min.y, -center.z] as Point };
  }, [object, height]);
  return <group position={position} rotation={[0, yaw, 0]} scale={fit.scale}><primitive object={object} position={fit.offset} /></group>;
}

function Furniture(props: Parameters<typeof FurnitureModel>[0]) {
  return <Suspense fallback={null}><FurnitureModel {...props} /></Suspense>;
}

/** Низкие стены оставляют видимым весь офис; проходы имеют ширину 2.8 м. */
function Partition({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const length = Math.max(w, d);
  const count = Math.ceil(length / 0.55);
  return <>
    <Part position={[x, 0, z]} size={[w, 1.05, d]} color="#e7e7dc" />
    <Part position={[x, 1.05, z]} size={[w + 0.05, 0.09, d + 0.05]} color="#faf8ef" shadow={false} />
    {Array.from({ length: count }, (_, i) => {
      const along = -length / 2 + (i + 0.5) * length / count;
      return <Blocker key={i} x={x + (w > d ? along : 0)} z={z + (d > w ? along : 0)} r={0.2} />;
    })}
  </>;
}

function OfficeWalls({ zone }: { zone: OfficeZone }) {
  const { x, z, w, d, door } = zone;
  const gap = 2.8;
  const side = (axis: "x" | "z", fixed: number, start: number, length: number, open: boolean) => {
    const sizes = open ? [{ center: -(length + gap) / 4, size: (length - gap) / 2 }, { center: (length + gap) / 4, size: (length - gap) / 2 }] : [{ center: 0, size: length }];
    return sizes.map((s, i) => <Partition key={`${axis}:${fixed}:${i}`} x={axis === "x" ? start + s.center : fixed} z={axis === "z" ? start + s.center : fixed} w={axis === "x" ? s.size : 0.2} d={axis === "z" ? s.size : 0.2} />);
  };
  return <>
    {side("x", z - d / 2, x, w, false)}
    {side("x", z + d / 2, x, w, door === "south")}
    {side("z", x - w / 2, z, d, door === "west")}
    {side("z", x + w / 2, z, d, door === "east")}
  </>;
}

function Table({ x, z, w = 2.8, d = 1.4 }: { x: number; z: number; w?: number; d?: number }) {
  return <>
    <Part position={[x, 0.78, z]} size={[w, 0.13, d]} color={WOOD} />
    {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Part key={`${sx}:${sz}`} position={[x + sx * (w / 2 - 0.16), 0, z + sz * (d / 2 - 0.16)]} size={[0.12, 0.78, 0.12]} color="#ad855e" />))}
    {Array.from({ length: Math.ceil(w / 1.1) }, (_, i) => <Blocker key={i} x={x - w / 2 + (i + 0.5) * w / Math.ceil(w / 1.1)} z={z} r={d / 2} />)}
  </>;
}

function Chair({ id, x, z, yaw = Math.PI }: { id: string; x: number; z: number; yaw?: number }) {
  return <>
    <Furniture url={FURNITURE.chairA} position={[x, 0, z]} height={0.95} yaw={yaw} />
    <SeatSpot id={id} position={[x, 0, z]} yaw={yaw} label="Сесть за стол" />
  </>;
}

function Desk({ id, x, z }: { id: string; x: number; z: number }) {
  return <>
    <Table x={x} z={z} />
    <Part position={[x, 0.91, z - 0.18]} size={[0.55, 0.06, 0.35]} color="#859a91" />
    <Part position={[x, 0.97, z - 0.3]} size={[0.11, 0.4, 0.1]} color="#7d928a" />
    <Part position={[x, 1.21, z - 0.34]} size={[1.1, 0.62, 0.085]} color={INK} />
    <Part position={[x, 1.265, z - 0.288]} size={[0.99, 0.51, 0.025]} color="#b9d8d0" emissive="#b9d8d0" intensity={0.15} shadow={false} />
    <Part position={[x, 0.93, z + 0.22]} size={[0.68, 0.035, 0.26]} color="#d7ded5" />
    <Part position={[x + 0.57, 0.93, z + 0.25]} size={[0.13, 0.07, 0.2]} color="#dee4d8" />
    <Part geo="cyl8" position={[x - 0.96, 0.91, z + 0.13]} size={[0.1, 0.22, 0.1]} color="#e9d3a2" />
    <Chair id={id} x={x} z={z + 1.18} />
    <Interactable id={`${id}-profile`} label="Мой профиль" position={[x + 2, 0, z + 0.2]} radius={1.2} onInteract={() => actions.openPanel("character")} />
  </>;
}

function ZoneContents({ zone, id }: { zone: OfficeZone; id: string }) {
  const { x, z, w, d, kind } = zone;
  if (kind === "work") {
    const xs = w >= 15 ? [-4.6, 0, 4.6] : w >= 10 ? [-2.5, 2.5] : [0];
    const zs = d >= 10 ? [-2.6, 2.4] : [-0.5];
    return <>{xs.flatMap((dx, a) => zs.map((dz, b) => <Desk key={`${a}:${b}`} id={`${id}-desk-${a}-${b}`} x={x + dx} z={z + dz} />))}</>;
  }
  if (kind === "meeting" || kind === "academy") {
    const tableW = Math.min(6, w - 3);
    return <>
      <Table x={x} z={z} w={tableW} d={2} />
      {[-1, 1].flatMap((side) => [-1, 0, 1].map((i) => <Chair key={`${side}:${i}`} id={`${id}-chair-${side}-${i}`} x={x + i * tableW / 3} z={z + side * 1.9} yaw={side > 0 ? Math.PI : 0} />))}
      <Part position={[x, 1.35, z - d / 2 + 0.18]} size={[Math.min(4, w - 2), 1.5, 0.12]} color="#fafbf4" />
      <Part position={[x, 1.5, z - d / 2 + 0.26]} size={[Math.min(3.5, w - 2.5), 0.07, 0.03]} color="#82a399" shadow={false} />
    </>;
  }
  return <>
    <Furniture url={FURNITURE.couch} position={[x, 0, z - 1.9]} height={1.1} />
    <Furniture url={FURNITURE.tableLow} position={[x, 0, z]} height={0.5} />
    <Furniture url={FURNITURE.books} position={[x, 0.5, z]} height={0.25} />
    <Blocker x={x} z={z} r={0.7} />
    <Furniture url={FURNITURE.armchair} position={[x - Math.min(2.5, w / 2 - 1.3), 0, z + 1.5]} height={1.1} yaw={0.7} />
    <Furniture url={FURNITURE.lampStanding} position={[x + w / 2 - 1.2, 0, z - d / 2 + 1.2]} height={1.8} />
    <Part position={[x + w / 2 - 1.3, 0, z + d / 2 - 1]} size={[1.8, 1.05, 0.85]} color="#b1bea1" />
    <Part position={[x + w / 2 - 1.3, 1.05, z + d / 2 - 1]} size={[1.95, 0.12, 1]} color="#f4eddb" />
    <Part position={[x + w / 2 - 1.3, 1.17, z + d / 2 - 1]} size={[0.55, 0.6, 0.55]} color={INK} />
    <Blocker x={x + w / 2 - 1.3} z={z + d / 2 - 1} r={0.8} />
  </>;
}

export function Office({ place }: { place: Place }) {
  const plan = officePlanFor(place);
  const openPanel = () => actions.openPanel(panelForPlace(place), place.id);
  const [rx, rz] = plan.reception;
  return <Room w={plan.w} d={plan.d} floor="#eee7d5" wall="#e8e7da" trim="#d2c7ae" wallHeight={1.3}>
    {Array.from({ length: Math.floor(plan.d / 1.4) }, (_, i) => <Part key={i} position={[0, 0.008, -plan.d / 2 + 0.8 + i * 1.4]} size={[plan.w - 0.4, 0.012, 0.024]} color="#ddd3bc" shadow={false} />)}
    {plan.zones.map((zone, i) => <group key={i}>
      <Part position={[zone.x, 0.025, zone.z]} size={[zone.w, 0.02, zone.d]} color={zone.kind === "lounge" ? "#e7ded1" : zone.kind === "work" ? "#dce5dc" : "#dce3e8"} shadow={false} />
      <OfficeWalls zone={zone} />
      <Sign text={zone.title} color={plan.accent} position={[zone.x, 1.45, zone.z - zone.d / 2 + 0.12]} width={Math.min(4.2, zone.w - 1)} height={0.5} />
      <ZoneContents zone={zone} id={`${place.id}-${i}`} />
    </group>)}
    <Part position={[rx, 0, rz]} size={[3, 1.05, 1.1]} color={plan.accent} />
    <Part position={[rx, 1.05, rz]} size={[3.2, 0.12, 1.25]} color="#f6f0e3" />
    <Blocker x={rx} z={rz} r={1.25} />
    <Sign text={place.name.replace("Башня ", "")} color={plan.accent} width={5.5} height={0.75} position={[0, 2, -plan.d / 2 + 0.3]} />
    <Interactable id="office-reception" label="Открыть информацию" position={[rx, 0, rz + 1.5]} radius={1.6} onInteract={openPanel} />
    <Furniture url={FURNITURE.cabinet} position={[-plan.w / 2 + 1.2, 0, plan.d / 2 - 1.1]} height={1.3} />
    <Furniture url={FURNITURE.cabinetSmall} position={[plan.w / 2 - 1.2, 0, plan.d / 2 - 1.1]} height={0.9} />
    <Sign text="Мой план" color={plan.accent} width={2.8} height={1} position={[plan.w / 2 - 4.5, 1.5, plan.d / 2 - 1.2]} />
    <Interactable id="office-plan" label="Открыть мой план" position={[plan.w / 2 - 4.5, 0, plan.d / 2 - 2]} radius={1.7} onInteract={() => actions.openPanel("quests")} />
  </Room>;
}
