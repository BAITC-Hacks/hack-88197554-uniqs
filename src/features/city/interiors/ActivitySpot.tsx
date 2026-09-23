"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { actions } from "@/lib/client-store";
import { GEO, mat } from "../kit";
import { playerPosition } from "../playerState";
import { sceneActions } from "../sceneState";
import { Interactable } from "./Room";

export type IndoorActivity = "practice" | "course" | "mentor" | "venue";
export const ACTIVITY_LABELS: Record<IndoorActivity, string> = { practice: "Практика", course: "Обучение", mentor: "Обсудить с наставником", venue: "Начать занятие" };

export function openIndoorActivity(kind: IndoorActivity, placeId?: string) {
  actions.clearMoveTarget();
  sceneActions.stand();
  if (kind === "mentor") actions.openPanel("mentor", "mentor");
  else actions.openPanel("venue", kind === "venue" ? placeId : kind === "course" ? "venue-course" : "venue-workshop");
}

export function ActivitySpot({ id, x, z, kind, placeId }: { id: string; x: number; z: number; kind: IndoorActivity; placeId?: string }) {
  const label = useRef<HTMLButtonElement>(null);
  const open = () => openIndoorActivity(kind, placeId);
  useFrame(() => {
    if (label.current) label.current.style.visibility = Math.hypot(playerPosition.x - x, playerPosition.z - z) < 13 ? "visible" : "hidden";
  });
  return <>
    <mesh geometry={GEO.ring} material={mat("#69c5a4", { emissive: "#3d9677", intensity: 0.5 })} position={[x, 0.08, z]} rotation={[-Math.PI / 2, 0, 0]} onClick={(event) => { event.stopPropagation(); open(); }} />
    <Html position={[x, 2.5, z]} center zIndexRange={[8, 0]}>
      <button ref={label} type="button" onClick={open} className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-950/95 px-3 py-1.5 text-xs font-medium text-white shadow-md hover:bg-emerald-800">✦ {ACTIVITY_LABELS[kind]}</button>
    </Html>
    <Interactable id={id} label={ACTIVITY_LABELS[kind]} position={[x, 0, z]} radius={1.9} onInteract={open} />
  </>;
}
