"use client";

// Интерьер текущего здания: отдельная сцена в начале координат, пока улица размонтирована.

import { getPlace } from "@/lib/world";
import { useScene } from "../sceneState";
import { Office } from "./Office";
import { Academy } from "./Academy";
import { Cafe } from "./Cafe";
import { YurtInterior } from "./YurtInterior";
import { FrontendOffice } from "./frontend/FrontendOffice";

export function Interior() {
  const interior = useScene((s) => s.interior);
  if (!interior) return null;
  const place = getPlace(interior.placeId);
  if (!place) return null;
  switch (place.kind) {
    case "office":
      if (place.id === "office-frontend") return <FrontendOffice key={`${place.id}:${interior.floor}`} floor={interior.floor} />;
      return <Office key={`${place.id}:${interior.floor}`} place={place} />;
    case "mentor":
      return <YurtInterior key={place.id} />;
    case "venue":
      if (place.eventType === "course") return <Academy key={place.id} place={place} />;
      if (place.eventType === "mentoring") return <Cafe key={place.id} place={place} />;
      return <Office key={place.id} place={place} />;
    default:
      return <Office key={place.id} place={place} />;
  }
}
