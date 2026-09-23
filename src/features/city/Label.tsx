"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { useClientStore } from "@/lib/client-store";
import type { Place } from "@/lib/types";
import { cn } from "@/lib/utils";
import { playerPosition } from "./playerState";

/** дальше этого расстояния от персонажа подпись прячется */
const LABEL_DISTANCE = 45;

export function Label({ place, height }: { place: Place; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef(true);
  const near = useClientStore((s) => s.nearPlaceId === place.id);
  // Html монтирует свой React-root в events.connected; пока его нет, цель сменится
  // после монтирования и drei синхронно размонтирует root посреди рендера.
  const connected = useThree((s) => s.events.connected);

  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    const d = Math.hypot(playerPosition.x - place.position[0], playerPosition.z - place.position[1]);
    const next = d < LABEL_DISTANCE;
    if (next !== shown.current) {
      shown.current = next;
      el.style.opacity = next ? "1" : "0";
    }
  });

  if (!connected) return null;
  return (
    <Html position={[0, height, 0]} center pointerEvents="none" zIndexRange={[5, 0]}>
      <div
        ref={ref}
        className={cn(
          "pointer-events-none select-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ring-1 transition-opacity duration-300",
          near ? "bg-slate-900 text-white ring-slate-900" : "bg-white/90 text-slate-800 ring-black/10",
        )}
      >
        {place.name}
      </div>
    </Html>
  );
}
