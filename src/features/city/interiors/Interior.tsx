"use client";

// Интерьер текущего здания: отдельная сцена в начале координат, пока улица размонтирована.

import { getPlace } from "@/lib/world";
import { useScene } from "../sceneState";
import { Academy } from "./Academy";
import { Cafe } from "./Cafe";
import { Hall } from "./Hall";
import { Lobby } from "./Lobby";
import { OfficeFloor } from "./OfficeFloor";
import { YurtInterior } from "./YurtInterior";

export function Interior() {
  const interior = useScene((s) => s.interior);
  if (!interior) return null;
  const place = getPlace(interior.placeId);
  if (!place) return null;
  switch (place.kind) {
    case "office":
      return interior.floor < 0 ? <Lobby key={place.id} place={place} /> : <OfficeFloor key={`${place.id}:${interior.floor}`} place={place} floor={interior.floor} />;
    case "mentor":
      return <YurtInterior key={place.id} />;
    case "venue":
      if (place.eventType === "course") return <Academy key={place.id} place={place} />;
      if (place.eventType === "mentoring") return <Cafe key={place.id} place={place} />;
      return <Hall key={place.id} place={place} />;
    default:
      return <Hall key={place.id} place={place} />;
  }
}
