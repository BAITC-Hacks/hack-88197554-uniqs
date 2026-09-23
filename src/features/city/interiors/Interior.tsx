"use client";

// Интерьер текущего здания: отдельная сцена в начале координат, пока улица размонтирована.

import { getPlace } from "@/lib/world";
import { useScene } from "../sceneState";
import { Hall } from "./Hall";
import { Lobby } from "./Lobby";
import { OfficeFloor } from "./OfficeFloor";

export function Interior() {
  const interior = useScene((s) => s.interior);
  if (!interior) return null;
  const place = getPlace(interior.placeId);
  if (!place) return null;
  if (place.kind === "office") {
    return interior.floor < 0 ? <Lobby key={place.id} place={place} /> : <OfficeFloor key={`${place.id}:${interior.floor}`} place={place} floor={interior.floor} />;
  }
  return <Hall key={place.id} place={place} />;
}
