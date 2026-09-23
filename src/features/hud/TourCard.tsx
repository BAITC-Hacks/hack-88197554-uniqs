"use client";

// Реплики наставника в туре по городу. Пункты строятся из profile и recommendations в store:
// башня отдела → площадки первых шагов → юрта → «город твой».

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { playerPosition } from "@/features/city/playerState";
import { getScene, sceneActions } from "@/features/city/sceneState";
import { actions, getState, useClientStore } from "@/lib/client-store";
import type { EventType, Place, Profile, Recommendation } from "@/lib/types";
import { getPlace, officeOf, venueOf } from "@/lib/world";
import { skillName, useEvents } from "./data";
import { tourActions, useTour } from "./tour";

const STUCK_MS = 2500;
const FADE_MS = 380;

interface Stop {
  id: string;
  place?: Place;
  title: string;
  text: string;
  chips?: string[];
  open?: string;
}

function buildStops(profile: Profile, recs: Recommendation[], typeOf: (eventId: string) => EventType | undefined): Stop[] {
  const e = profile.employee;
  const t = profile.target;
  const gp = profile.gradeProgress;
  const name = e.full_name.split(" ")[0];
  const goal = t ? `${t.role} · ${t.grade}` : null;
  const gap = profile.gaps.find((g) => g.critical) ?? profile.gaps[0];
  const stops: Stop[] = [{
    id: "hello",
    title: "Наставник",
    text: goal
      ? `Сәлем, ${name}! Твоя цель — ${goal}, закрыто ${gp.met} из ${gp.total} требований. Покажу, с чего начать.`
      : `Сәлем, ${name}! Цель пока не задана, но город поможет её найти. Покажу, с чего начать.`,
  }];

  const office = officeOf(e.department);
  stops.push({
    id: office.id,
    place: office,
    title: office.name,
    text: `Этажи башни — это грейды. Ты на этаже ${e.grade}${t ? `, цель — ${t.role === e.role ? t.grade : goal}` : ""}. `
      + (gap ? `Главный разрыв — ${skillName(gap.skillId)}: ${gap.current} из ${gap.required}${gap.critical ? ", ключевой навык" : ""}.` : "Все требования цели уже закрыты."),
    open: "Открыть башню",
  });

  const seen = new Set<string>();
  recs.slice(0, 2).forEach((r, i) => {
    const type = typeOf(r.eventId);
    if (!type) return;
    const venue = venueOf(type);
    if (!venue || seen.has(venue.id)) return;
    seen.add(venue.id);
    stops.push({
      id: `${venue.id}-${r.eventId}`,
      place: venue,
      title: venue.name,
      text: `${i === 0 ? "Твой первый шаг" : "Следующий шаг"} — «${r.title}». Почему он:`,
      chips: r.factors.slice(0, 3).map((f) => f.text),
      open: "Открыть площадку",
    });
  });

  const yurt = getPlace("mentor");
  if (yurt) {
    stops.push({
      id: "mentor",
      place: yurt,
      title: yurt.name,
      text: "Это моя юрта. Возвращайся ко мне за советом: закроешь шаг — пересоберу план под твою цель.",
    });
  }
  stops.push({
    id: "done",
    title: "Город твой",
    text: "Над площадками квестов горит «!», прогресс этажа видно в башне отдела. Исследуй в своём темпе, участие добровольное.",
  });
  return stops;
}

/** идём к месту; если автоход застрял или игрок в здании — переносим с затемнением */
function useWalkTo(place: Place | undefined, blink: (fn: () => void) => void) {
  const placeId = place?.id;
  useEffect(() => {
    const target = placeId ? getPlace(placeId) : undefined;
    if (!target) return;
    const [tx, tz] = target.entrance;
    if (getScene().mode === "interior") {
      sceneActions.exit(target.entrance);
      return;
    }
    if (Math.hypot(playerPosition.x - tx, playerPosition.z - tz) < 1) return;
    actions.closePanel();
    actions.walkTo(target.entrance);
    let best = Infinity;
    let since = performance.now();
    const timer = setInterval(() => {
      const mt = getState().moveTarget;
      if (!mt || mt.position[0] !== tx || mt.position[1] !== tz) return clearInterval(timer);
      const d = Math.hypot(playerPosition.x - tx, playerPosition.z - tz);
      const now = performance.now();
      if (d < best - 0.25) {
        best = d;
        since = now;
      } else if (now - since > STUCK_MS) {
        clearInterval(timer);
        blink(() => {
          actions.travelTo(target.id);
          actions.closePanel();
        });
      }
    }, 300);
    return () => clearInterval(timer);
  }, [placeId, blink]);
}

export function TourCard({ onGuide }: { onGuide: () => void }) {
  const active = useTour((s) => s.active);
  const index = useTour((s) => s.index);
  const profile = useClientStore((s) => s.profile);
  const employeeId = useClientStore((s) => s.employeeId);
  const stored = useClientStore((s) => s.recommendations);
  const events = useEvents();
  const [fallback, setFallback] = useState<{ employeeId: string; list: Recommendation[] } | null>(null);
  const [black, setBlack] = useState(false);
  const [blink] = useState(() => (fn: () => void) => {
    setBlack(true);
    setTimeout(() => {
      fn();
      setTimeout(() => setBlack(false), 80);
    }, FADE_MS);
  });

  // Пока наставник не вернул шаги и store пуст — берём шаги движка.
  useEffect(() => {
    if (!active) return;
    let live = true;
    void fetch(`/api/recommend/${encodeURIComponent(employeeId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Recommendation[]>) : []))
      .then((list) => { if (live) setFallback({ employeeId, list }); });
    return () => { live = false; };
  }, [active, employeeId]);

  const recs = stored.length ? stored : fallback?.employeeId === employeeId ? fallback.list : [];
  const ready = !!profile && profile.employee.employee_id === employeeId;
  const stops = ready ? buildStops(profile, recs, (id) => events.find((ev) => ev.event_id === id)?.type) : [];
  const i = Math.min(index, Math.max(0, stops.length - 1));
  const stop = active ? stops[i] : undefined;

  useWalkTo(stop?.place, blink);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-30 bg-slate-950 transition-opacity duration-300" style={{ opacity: black ? 1 : 0 }} />
      {stop && <Card className="pointer-events-auto absolute bottom-16 left-1/2 w-[560px] -translate-x-1/2 gap-0 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"><Sparkles className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Наставник · <span className="font-normal text-muted-foreground">{stop.title}</span></p>
              {i > 0 && <span className="text-xs tabular-nums text-muted-foreground">{i} / {stops.length - 1}</span>}
            </div>
            <p className="mt-1 text-sm leading-relaxed">{stop.text}</p>
            {!!stop.chips?.length && <div className="mt-2 flex flex-wrap gap-1.5">{stop.chips.map((c) => <Badge key={c} variant="secondary" className="h-auto whitespace-normal text-left">{c}</Badge>)}</div>}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {i === 0 ? <>
            <Button size="sm" onClick={() => { onGuide(); tourActions.go(1); }}>Веди<ArrowRight /></Button>
            <Button size="sm" variant="outline" onClick={() => tourActions.finish()}>Сам исследую</Button>
          </> : stop.id === "done" ? <>
            <Button size="sm" variant="ghost" onClick={() => tourActions.go(i - 1)}><ArrowLeft />Назад</Button>
            <Button size="sm" onClick={() => tourActions.finish()}>Исследовать</Button>
          </> : <>
            <Button size="sm" variant="ghost" onClick={() => tourActions.go(i - 1)}><ArrowLeft />Назад</Button>
            {stop.open && stop.place && <Button size="sm" variant="outline" onClick={() => { const id = stop.place!.id; actions.clearMoveTarget(); actions.openPlace(id); }}>{stop.open}</Button>}
            <Button size="sm" onClick={() => tourActions.go(i + 1)}>Дальше<ArrowRight /></Button>
            <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => tourActions.finish()}><X />Пропустить тур</Button>
          </>}
        </div>
      </Card>}
    </>
  );
}
