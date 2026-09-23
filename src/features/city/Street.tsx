"use client";

// Улица: земля и дороги, места, декор, машины, прохожие. Монтируется только в режиме street.

import { useEffect } from "react";
import { Decor } from "./Decor";
import { Ground } from "./Ground";
import { Npcs } from "./Npc";
import { Places } from "./Places";
import { QuestMarkers } from "./QuestMarkers";
import { setWalkBounds } from "./sceneState";

export function Street() {
  useEffect(() => {
    setWalkBounds({ minX: -60, maxX: 60, minZ: -65, maxZ: 55, blockers: [] });
  }, []);
  return (
    <group>
      <Ground />
      <Decor />
      <Places />
      <Npcs />
      <QuestMarkers />
    </group>
  );
}
