"use client";

import { ArrowRight, Compass, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { actions, useClientStore } from "@/lib/client-store";
import { venueForEvent } from "@/lib/world";
import { useEvents } from "./data";
import type { useNextStep } from "./useNextStep";

export function NextStep({ request }: { request: ReturnType<typeof useNextStep> }) {
  const recs = useClientStore((s) => s.recommendations);
  const accepted = useClientStore((s) => s.acceptedQuests);
  const events = useEvents();
  const rec = recs.find((r) => accepted.includes(r.eventId)) ?? recs[0];
  const event = events.find((e) => e.event_id === rec?.eventId);
  const venue = event ? venueForEvent(event) : undefined;
  const chosen = !!rec && accepted.includes(rec.eventId);
  const phase = [...request.steps].reverse().find((s) => s.type === "thought");
  const calls = request.steps.filter((s) => s.type === "tool_call");

  return <Card className="pointer-events-auto w-72 bg-white/95 shadow-sm" size="sm"><CardContent className="space-y-3" aria-live="polite">
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Compass className="size-4" />Следующий шаг</div>
    {request.busy ? <>
      <p className="text-sm font-medium">Наставник подбирает ваш маршрут</p>
      <p className="text-xs text-muted-foreground">{phase?.type === "thought" ? phase.text : "Смотрим профиль и карьерную цель…"}</p>
      <ul className="space-y-1 text-xs text-muted-foreground">{calls.map((s, i) => <li key={i}>{s.type === "tool_call" ? `→ ${s.tool}` : ""}</li>)}</ul>
    </> : rec ? <>
      <p className="text-sm font-medium">{rec.title}</p>
      {venue && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{venue.name}</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">{rec.explanation}</p>
      <div className="flex gap-2"><Button size="sm" disabled={!venue} onClick={() => { if (!venue) return; actions.acceptQuest(rec.eventId); actions.travelTo(venue.id); actions.closePanel(); }}>{chosen ? "Перейти" : "Выбрать и перейти"}<ArrowRight /></Button><Button size="sm" variant="ghost" onClick={() => actions.openPanel("quests")}>План</Button></div>
    </> : <>
      <p className="text-sm font-medium">{request.finished ? "Обсудите следующий шаг с наставником" : "С чего начать сегодня?"}</p>
      <p className="text-xs text-muted-foreground">{request.finished ? "В текущем каталоге не найден подходящий шаг. Посмотрите свою цель и требования в профиле." : "Наставник сопоставит вашу цель, навыки и историю участия."}</p>
      <Button size="sm" onClick={() => void request.recommend()}>Подобрать следующий шаг<ArrowRight /></Button>
    </>}
    {request.error && <p role="alert" className="text-xs text-destructive">{request.error}</p>}
  </CardContent></Card>;
}
