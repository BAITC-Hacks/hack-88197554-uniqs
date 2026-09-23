"use client";

// Интерьер текущего здания: отдельная сцена в начале координат, пока улица размонтирована.

import { getPlace } from "@/lib/world";
import { useScene } from "../sceneState";
import { Hall } from "./Hall";

export function Interior() {
  const interior = useScene((s) => s.interior);
  if (!interior) return null;
  const place = getPlace(interior.placeId);
  if (!place) return null;
  return <Hall place={place} />;
}
