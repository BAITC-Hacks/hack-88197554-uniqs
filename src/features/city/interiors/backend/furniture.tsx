"use client";

import { Suspense, useMemo } from "react";
import { Box3, Vector3 } from "three";
import { Part } from "../../kit";
import { FURNITURE, useModel } from "../../models";
import { Blocker, SeatSpot } from "../Room";

export const INK = "#405650";
export const WOOD = "#cbb48c";
export const GREEN = "#487a69";

export function Solid({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const nx = Math.max(1, Math.ceil(w / 0.5)), nz = Math.max(1, Math.ceil(d / 0.5));
  return <>{Array.from({ length: nx }, (_, i) => Array.from({ length: nz }, (_, j) =>
    <Blocker key={`${i}-${j}`} x={x - w / 2 + (i + 0.5) * w / nx} z={z - d / 2 + (j + 0.5) * d / nz} r={0.25} />
  ))}</>;
}

function ModelInner({ url, x, z, height, yaw = 0 }: { url: string; x: number; z: number; height: number; yaw?: number }) {
  const model = useModel(url);
  const fit = useMemo(() => {
    const bounds = new Box3().setFromObject(model), size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3());
    return { scale: height / Math.max(size.y, 0.01), offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number] };
  }, [model, height]);
  return <group position={[x, 0, z]} rotation={[0, yaw, 0]} scale={fit.scale}><primitive object={model} position={fit.offset} /></group>;
}
export function Model(props: Parameters<typeof ModelInner>[0]) {
  return <Suspense fallback={null}><ModelInner {...props} /></Suspense>;
}

export function Chair({ x, z, id, yaw = Math.PI, interactive = true }: { x: number; z: number; id: string; yaw?: number; interactive?: boolean }) {
  return <><Model url={FURNITURE.chairA} x={x} z={z} height={0.95} yaw={yaw} />
    {interactive && <SeatSpot id={`backend-${id}`} position={[x, 0, z]} yaw={yaw} label="Сесть" />}
  </>;
}

export function Plant({ x, z }: { x: number; z: number }) {
  return <>
    <Part geo="cyl8" position={[x, 0, z]} size={[0.35, 0.55, 0.35]} color="#e5dfd0" />
    {[-1, 0, 1].map((n) => <Part key={n} geo="ico" position={[x + n * 0.23, 0.62 + (n === 0 ? 0.36 : 0), z + n * 0.12]} size={[0.4, 0.65, 0.36]} color={n ? "#89a678" : "#5f8b6c"} />)}
    <Blocker x={x} z={z} r={0.4} />
  </>;
}

export function Table({ x, z, w = 4, d = 1.8 }: { x: number; z: number; w?: number; d?: number }) {
  return <>
    <Part position={[x, 0.8, z]} size={[w, 0.12, d]} color={WOOD} />
    {[-1, 1].flatMap((a) => [-1, 1].map((b) => <Part key={`${a}-${b}`} position={[x + a * (w / 2 - 0.2), 0, z + b * (d / 2 - 0.2)]} size={[0.1, 0.8, 0.1]} color={INK} />))}
    <Solid x={x} z={z} w={w} d={d} />
  </>;
}

export function Desk({ x, z, id, yaw = 0 }: { x: number; z: number; id: string; yaw?: number }) {
  return <>
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <Part position={[0, 0.8, 0]} size={[1.9, 0.1, 0.95]} color="#ded6c2" />
      {[-0.78, 0.78].map((dx) => <Part key={dx} position={[dx, 0, 0]} size={[0.1, 0.8, 0.7]} color={INK} />)}
      <Part position={[0, 0.9, -0.2]} size={[0.08, 0.25, 0.1]} color={INK} />
      <Part position={[0, 1.05, -0.22]} size={[0.82, 0.52, 0.07]} color={INK} />
      <Part position={[0, 1.1, -0.178]} size={[0.73, 0.42, 0.02]} color="#a8cec1" emissive="#b6dfd5" intensity={0.12} shadow={false} />
      <Part position={[0, 0.9, 0.22]} size={[0.57, 0.025, 0.2]} color="#8b9a90" />
      <Part geo="cyl8" position={[0.65, 0.9, 0.1]} size={[0.09, 0.16, 0.09]} color="#f6f0dc" />
    </group>
    <Solid x={x} z={z} w={Math.abs(Math.cos(yaw)) * 1.9 + Math.abs(Math.sin(yaw)) * 0.95} d={Math.abs(Math.sin(yaw)) * 1.9 + Math.abs(Math.cos(yaw)) * 0.95} />
    <Chair id={id} x={x + Math.sin(yaw) * 1.05} z={z + Math.cos(yaw) * 1.05} yaw={yaw + Math.PI} />
  </>;
}

export function Meeting({ x, z, id, large = false, round = false }: { x: number; z: number; id: string; large?: boolean; round?: boolean }) {
  if (round) return <>
    <Part geo="cyl" position={[x, 0.8, z]} size={[1.45, 0.12, 1.45]} color={WOOD} />
    <Part geo="cyl8" position={[x, 0, z]} size={[0.3, 0.8, 0.3]} color={INK} />
    <Blocker x={x} z={z} r={1.4} />
    {Array.from({ length: 5 }, (_, i) => { const a = i * Math.PI * 2 / 5; return <Chair key={i} id={`${id}-${i}`} x={x + Math.sin(a) * 2.1} z={z + Math.cos(a) * 2.1} yaw={a + Math.PI} />; })}
  </>;
  return <>
    <Table x={x} z={z} w={large ? 7.6 : 4.7} d={2.1} />
    {[-1, 1].flatMap((side) => Array.from({ length: large ? 5 : 3 }, (_, i) => <Chair key={`${side}-${i}`} id={`${id}-${side}-${i}`} x={x + (i - (large ? 2 : 1)) * 1.4} z={z + side * 1.85} yaw={side > 0 ? Math.PI : 0} />))}
    <Part position={[x, 0.93, z]} size={[0.8, 0.03, 0.5]} color="#f7f4e9" />
  </>;
}

export function Lounge({ x, z }: { x: number; z: number }) {
  return <>
    <Part position={[x, 0.01, z]} size={[5.3, 0.025, 3.4]} color="#d7c9ae" shadow={false} />
    <Model url={FURNITURE.couch} x={x} z={z - 1.2} height={1.08} />
    <Model url={FURNITURE.armchair} x={x - 1.7} z={z + 1} height={1} yaw={0.65} />
    <Model url={FURNITURE.tableLow} x={x + 0.6} z={z + 0.4} height={0.45} />
    <Solid x={x} z={z - 1.2} w={3.2} d={1} />
    <Blocker x={x + 0.6} z={z + 0.4} r={0.65} />
  </>;
}
