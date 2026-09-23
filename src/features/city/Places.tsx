"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { actions } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { PLACES, TOWER_FLOOR_HEIGHT, TOWER_FLOORS } from "@/lib/world";
import { Home, Soon, Yurt, soonHeight } from "./Buildings";
import { Label } from "./Label";
import { playerPosition } from "./playerState";
import { PODIUM_H, Tower } from "./Tower";
import { Venue } from "./Venue";

const VENUE_LABEL_HEIGHT = 8.5;
/** здание между камерой и персонажем на таком удалении по z «опускается», чтобы не закрывать его */
const OCCLUDE_DEPTH = 18;
const OCCLUDED_SCALE = 0.12;

function labelHeight(place: Place) {
  switch (place.kind) {
    case "office":
      return PODIUM_H + TOWER_FLOORS * TOWER_FLOOR_HEIGHT + 3;
    case "venue":
      return place.eventType === "compliance" ? 9 : place.eventType === "meetup" ? 4 : VENUE_LABEL_HEIGHT;
    case "mentor":
      return 5.4;
    case "home":
      return 5.2;
    case "soon":
      return soonHeight(place) + 2;
  }
}

function PlaceBody({ place }: { place: Place }) {
  switch (place.kind) {
    case "office":
      return <Tower place={place} />;
    case "venue":
      return <Venue place={place} />;
    case "mentor":
      return <Yurt />;
    case "home":
      return <Home place={place} />;
    case "soon":
      return <Soon place={place} />;
  }
}

function setCursor(cursor: string) {
  document.body.style.cursor = cursor;
}

/** камера смотрит с +z: здание южнее персонажа и рядом по x закрывает его — опускаем до «среза» */
function useCutaway(place: Place) {
  const body = useRef<Group>(null);
  useFrame((_, dt) => {
    const g = body.current;
    if (!g) return;
    const dz = place.position[1] - playerPosition.z;
    const dx = Math.abs(place.position[0] - playerPosition.x);
    const hides = dz > 0 && dz < OCCLUDE_DEPTH && dx < place.radius + 2.5;
    const target = hides ? OCCLUDED_SCALE : 1;
    if (g.scale.y !== target) {
      const next = g.scale.y + (target - g.scale.y) * (1 - Math.exp(-Math.min(dt, 0.05) * 10));
      g.scale.y = Math.abs(next - target) < 0.005 ? target : next;
    }
  });
  return body;
}

function PlaceNode({ place }: { place: Place }) {
  const body = useCutaway(place);
  const handlers = useMemo(
    () => ({
      onPointerDown(e: ThreeEvent<PointerEvent>) {
        if (e.button !== 0) return;
        e.stopPropagation();
        actions.walkTo(place.entrance, place.id);
      },
      onPointerOver(e: ThreeEvent<PointerEvent>) {
        e.stopPropagation();
        setCursor("pointer");
      },
      onPointerOut() {
        setCursor("");
      },
    }),
    [place],
  );

  return (
    <group position={[place.position[0], 0, place.position[1]]} {...handlers}>
      <group ref={body}>
        <PlaceBody place={place} />
      </group>
      <Label place={place} height={labelHeight(place)} />
    </group>
  );
}

export function Places() {
  return PLACES.map((place) => <PlaceNode key={place.id} place={place} />);
}
