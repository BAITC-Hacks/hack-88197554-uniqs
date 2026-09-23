"use client";

import type { Place } from "@/lib/types";
import { ActivitySpot } from "./ActivitySpot";
import { Colleague, CorridorColleague } from "./Colleague";
import { backendFloorIndex } from "./backend/layout";
import { frontendFloorIndex } from "./frontend/layout";

export function OfficeLife({ place, floor }: { place: Place; floor: number }) {
  const frontend = place.id === "office-frontend";
  const index = frontend ? frontendFloorIndex(floor) : backendFloorIndex(floor);
  // Метки находятся в проходах у входов в комнаты, а не за столами.
  const practice: [number, number] = frontend ? [-9.3, 0.5] : index === 3 ? [-9.5, 1.5] : [index === 0 ? -7.4 : -10.5, 0.5];
  const learning: [number, number] = frontend ? [9.4, 1.5] : index === 3 ? [-9.5, 10.5] : [index === 0 ? 5.3 : 10.4, 1];
  const mentor: [number, number] = frontend ? [5.7, 10.1] : [6.5, -5.4];
  return <>
    <ActivitySpot id="office-practice" x={practice[0]} z={practice[1]} kind="practice" />
    <ActivitySpot id="office-learning" x={learning[0]} z={learning[1]} kind="course" />
    <ActivitySpot id="office-mentor" x={mentor[0]} z={mentor[1]} kind="mentor" />
    <Colleague id="office-host" x={frontend ? 6.5 : 7.8} z={frontend ? 10.1 : -5.4} yaw={-Math.PI / 2} />
    <CorridorColleague from={frontend ? [-6, -8.2] : [-9, -5.5]} to={frontend ? [6, -8.2] : [3.5, -5.5]} phase={index * 3} />
    {frontend && index === 0 && <Colleague id="frontend-welcome" x={0} z={12.6} />}
  </>;
}
