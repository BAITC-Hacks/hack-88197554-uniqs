"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { playerPosition } from "@/features/city/playerState";
import { useScene } from "@/features/city/sceneState";
import { officePlanFor } from "@/features/city/interiors/officePlans";
import { skillName, TODAY, useEvents } from "@/features/hud/data";
import { actions, useClientStore } from "@/lib/client-store";
import type { Place, Profile } from "@/lib/types";
import { venueForEvent } from "@/lib/world";
import { benefitsOf, eligibleNow, pathId, type CareerPreview } from "./domain";

function interiorAnchor(place: Place): [number, number, number] {
  if (place.eventType === "course") return [6.5, 2.4, 5.8];
  if (place.eventType === "mentoring") return [3.8, 2.4, 4];
  const [x, z] = officePlanFor(place).reception;
  return [x, 2.4, z];
}

/** Only the selected employee's profile and recommendations enter these local overlays. */
export function WhyHere() {
  const profile = useClientStore(s => s.profile);
  const employeeId = useClientStore(s => s.employeeId);
  return profile?.employee.employee_id === employeeId
    ? <PersonalHints key={`${employeeId}:${profile.target?.role}:${profile.target?.grade}`} profile={profile} /> : null;
}

function PersonalHints({ profile }: { profile: Profile }) {
  const recommendations = useClientStore(s => s.recommendations);
  const accepted = useClientStore(s => s.acceptedQuests);
  const events = useEvents();
  const interior = useScene(s => s.interior);
  const locked = useScene(s => s.controlsLocked);
  const fade = useScene(s => s.fade);
  const connected = useThree(s => s.events.connected);
  const [fallback, setFallback] = useState<{ source: Profile; preview: CareerPreview } | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [nearest, setNearest] = useState<string | null>(null);
  const nextCheck = useRef(0);
  const nearestRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile.target) return;
    const controller = new AbortController();
    void fetch(`/api/career/preview?employeeId=${encodeURIComponent(profile.employee.employee_id)}`, { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<CareerPreview> : null)
      .then(preview => { if (preview && !controller.signal.aborted) setFallback({ source: profile, preview }); })
      .catch(() => { /* Existing mentor recommendations remain available if preview is unavailable. */ });
    return () => controller.abort();
  }, [profile]);

  const hints = useMemo(() => {
    if (!profile.target) return [];
    const ownPath = fallback?.source === profile ? fallback.preview.paths.find(p => p.id === pathId(profile.target!.role, profile.target!.grade)) : undefined;
    const recs = recommendations.length ? recommendations : ownPath?.steps ?? [];
    const ids = [...new Set([...recs.map(r => r.eventId), ...accepted])];
    const byPlace = new Map<string, { place: Place; eventId: string; reason: string; level: string }>();
    for (const id of ids) {
      const event = events.find(e => e.event_id === id);
      if (!event || !eligibleNow(event, profile, TODAY)) continue;
      const best = benefitsOf(event, profile)[0];
      if (!best) continue;
      const place = venueForEvent(event);
      if (byPlace.has(place.id)) continue;
      byPlace.set(place.id, {
        place, eventId: id,
        reason: `Здесь доступно «${event.title}». ${best.to >= best.required ? "Закрывает" : "Помогает сократить"} ${best.critical ? "критичный " : ""}пробел в навыке ${skillName(best.skillId)} для ${profile.target.role} · ${profile.target.grade}.`,
        level: `${skillName(best.skillId)}: ${best.current} → ${best.to} · нужно ${best.required}`,
      });
    }
    return [...byPlace.values()].slice(0, 3);
  }, [profile, fallback, recommendations, accepted, events]);

  useFrame(({ clock }) => {
    if (clock.elapsedTime < nextCheck.current) return;
    nextCheck.current = clock.elapsedTime + 0.2;
    let id: string | null = null;
    let closest = 9;
    if (!interior) for (const hint of hints) {
      const distance = Math.hypot(playerPosition.x - hint.place.entrance[0], playerPosition.z - hint.place.entrance[1]);
      if (distance < closest) { closest = distance; id = hint.place.id; }
    }
    if (nearestRef.current !== id) { nearestRef.current = id; setNearest(id); }
  });

  if (!connected || locked || fade) return null;
  return hints.filter(hint => !interior || interior.placeId === hint.place.id).map(hint => {
    const expanded = !!interior || pinned === hint.place.id || (!pinned && nearest === hint.place.id);
    const position: [number, number, number] = interior ? interiorAnchor(hint.place) : [hint.place.entrance[0], 2.8, hint.place.entrance[1]];
    return <Html key={hint.place.id} position={position} center zIndexRange={[8, 1]}>
      <div className="pointer-events-auto rounded-xl border border-emerald-200 bg-white/95 text-slate-900 shadow-lg" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
        <button type="button" aria-expanded={expanded} aria-label={`Почему мне сюда? ${hint.place.name}`} onClick={() => setPinned(pinned === hint.place.id ? null : hint.place.id)} className="flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-xs font-semibold text-emerald-800 focus-visible:outline-2 focus-visible:outline-emerald-600">
          <Sparkles className="size-3.5" />Почему мне сюда?
        </button>
        {expanded && <div className="w-[290px] space-y-2 px-3 pb-3">
          <p className="text-[10px] text-slate-500">Персонально для {profile.employee.full_name}</p>
          <p className="text-xs leading-relaxed">{hint.reason}</p>
          <p className="rounded-md bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-800">{hint.level}</p>
          <Button size="xs" variant="ghost" className="w-full justify-between" onClick={() => actions.openPanel("venue", hint.place.id)}>Открыть активности<ArrowRight /></Button>
        </div>}
      </div>
    </Html>;
  });
}
