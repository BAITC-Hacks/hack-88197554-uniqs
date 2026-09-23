"use client";

// «!» над площадками, где ждут взятые квесты и рекомендации наставника; «+1 навык» над персонажем после «Выполнено».

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { useClientStore } from "@/lib/client-store";
import type { ProgressDelta } from "@/lib/types";
import { skillName, useEvents } from "@/features/hud/data";
import { venueForEvent } from "@/lib/world";
import { playerPosition } from "./playerState";
import { sceneActions } from "./sceneState";

const MARKER_HEIGHT = 10.5;

export function QuestMarkers() {
  const accepted = useClientStore((s) => s.acceptedQuests);
  const recommendations = useClientStore((s) => s.recommendations);
  const events = useEvents();
  const connected = useThree((s) => s.events.connected);

  const marks = useMemo(() => {
    const byPlace = new Map<string, { place: ReturnType<typeof venueForEvent>; taken: boolean; count: number }>();
    const ids = new Set([...accepted, ...recommendations.map((r) => r.eventId)]);
    for (const id of ids) {
      const event = events.find((e) => e.event_id === id);
      if (!event) continue;
      const place = venueForEvent(event);
      const cur = byPlace.get(place.id) ?? { place, taken: false, count: 0 };
      cur.count += 1;
      cur.taken ||= accepted.includes(id);
      byPlace.set(place.id, cur);
    }
    return [...byPlace.values()];
  }, [accepted, recommendations, events]);

  if (!connected) return null;
  return marks.map(({ place, taken, count }) => (
    <Bounce key={place.id} position={[place.position[0], MARKER_HEIGHT, place.position[1]]}>
      <Html center pointerEvents="none" zIndexRange={[6, 0]}>
        <div
          className={`pointer-events-none flex h-9 w-9 items-center justify-center rounded-full text-xl font-black shadow-lg ring-2 ring-white ${taken ? "bg-emerald-500 text-white" : "bg-amber-400 text-slate-900"}`}
          title={taken ? "взятый квест" : "рекомендация"}
        >
          !{count > 1 ? <span className="ml-0.5 text-xs">{count}</span> : null}
        </div>
      </Html>
    </Bounce>
  ));
}

function Bounce({ position, children }: { position: [number, number, number]; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (g) g.position.y = position[1] + Math.sin(clock.elapsedTime * 3) * 0.35;
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

/** «+1 Mentoring» всплывает над персонажем после «Выполнено», персонаж радуется */
export function DeltaPopup() {
  const delta = useClientStore((s) => s.lastDelta);
  const [hidden, setHidden] = useState<ProgressDelta | null>(null);
  const ref = useRef<Group>(null);
  const connected = useThree((s) => s.events.connected);

  const lines = useMemo(() => {
    if (!delta) return [];
    const out = delta.skills.filter((s) => s.to > s.from).map((s) => `+${s.to - s.from} ${skillName(s.skillId)}`);
    if (delta.gradeReady) out.push("Готов к разговору о повышении!");
    return out;
  }, [delta]);

  useEffect(() => {
    if (!delta || lines.length === 0) return;
    sceneActions.gesture("cheer");
    const t = setTimeout(() => setHidden(delta), 3200);
    return () => clearTimeout(t);
  }, [delta, lines]);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (g) g.position.set(playerPosition.x, playerPosition.y + 2.4 + Math.sin(clock.elapsedTime * 2) * 0.1, playerPosition.z);
  });

  if (!delta || lines.length === 0 || hidden === delta || !connected) return null;
  return (
    <group ref={ref}>
      <Html center pointerEvents="none" zIndexRange={[8, 0]}>
        <div className="pointer-events-none flex flex-col items-center gap-1">
          {lines.map((l) => (
            <div key={l} className="whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-white shadow-lg ring-2 ring-white">
              {l}
            </div>
          ))}
        </div>
      </Html>
    </group>
  );
}
