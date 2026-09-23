"use client";

// Простой зал для площадок без своего интерьера: стойка с расписанием, ряды стульев, растения.

import { useCallback } from "react";
import { actions } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { PALETTE, Part, Sign } from "../kit";
import { FURNITURE, Model } from "../models";
import { Blocker, Interactable, Room, SeatSpot } from "./Room";

const DESK: [number, number, number] = [0, 0, -5.4];

export function Hall({ place }: { place: Place }) {
  const openPanel = useCallback(() => actions.openPanel(place.kind === "venue" ? "venue" : "soon", place.id), [place]);
  return (
    <Room w={16} d={16} floor="#d6cfc0" wall="#f1ece2">
      {/* стойка с расписанием */}
      <group position={DESK}>
        <Part size={[4.2, 1.1, 1]} color={PALETTE.wood} />
        <Part position={[0, 1.1, 0]} size={[4.4, 0.08, 1.2]} color={PALETTE.white} shadow={false} />
        <Sign text={place.name} color="#2f6f9f" width={4} height={0.9} position={[0, 2.4, -2.1]} />
        <Part position={[0, 0, -2.3]} size={[4.6, 0.12, 0.3]} color={PALETTE.dark} shadow={false} />
      </group>
      <Blocker x={0} z={-5.4} r={2.2} />
      <Interactable id="desk" label="Расписание и активности" position={[0, 0, -4.4]} radius={2} onInteract={openPanel} />
      {/* ряды стульев */}
      {[-2, 0.5].map((z) =>
        [-3, -1.5, 0, 1.5, 3].map((x) => (
          <group key={`${x}-${z}`}>
            <Model url={FURNITURE.chairA} position={[x, 0, z]} scale={0.85} rotation={[0, Math.PI, 0]} />
            <SeatSpot id={`seat-${x}-${z}`} position={[x, 0, z]} yaw={Math.PI} />
          </group>
        )),
      )}
      <Model url={FURNITURE.cactusA} position={[-6.8, 0, -6.8]} scale={1.2} />
      <Model url={FURNITURE.cactusB} position={[6.8, 0, -6.8]} scale={1.2} />
      <Model url={FURNITURE.lampStanding} position={[-6.8, 0, 5]} scale={0.9} />
      <Model url={FURNITURE.lampStanding} position={[6.8, 0, 5]} scale={0.9} />
      <Model url={FURNITURE.shelfLarge} position={[6.5, 1.4, -2]} scale={1} rotation={[0, -Math.PI / 2, 0]} />
    </Room>
  );
}
