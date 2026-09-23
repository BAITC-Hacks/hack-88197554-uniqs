"use client";

import { useState } from "react";
import { CheckCircle2, Code2, Lightbulb, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { nextSession, postProgress, skillName, useEvents } from "@/features/hud/data";
import { actions, getState, useClientStore } from "@/lib/client-store";
import type { DevEvent, PanelProps, Profile } from "@/lib/types";
import { getPlace } from "@/lib/world";
import { alreadyCompleted, exerciseFor, participationBlock } from "./exercises";
import PracticeDialog from "./PracticeDialog";

const FORMAT: Record<DevEvent["format"], string> = { online: "онлайн", offline: "офлайн", self_paced: "в своём темпе" };

function EventRow({ event, accepted, profile, finished, onStart }: { event: DevEvent; accepted: boolean; profile: Profile; finished: boolean; onStart: () => void }) {
  const [busy, setBusy] = useState(false);
  const session = nextSession(event);
  const done = finished || alreadyCompleted(event, profile);
  const blocked = participationBlock(event, profile);
  const exercise = exerciseFor(event);

  async function decline() {
    const employeeId = profile.employee.employee_id;
    setBusy(true);
    try {
      await postProgress({ employeeId, eventId: event.event_id, status: "declined" });
      if (getState().employeeId !== employeeId) return;
      actions.dropQuest(event.event_id);
      void actions.refreshProfile();
      toast("Шаг отложен. Можно вернуться к нему позже.");
    } catch (error) { toast.error(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  return (
    <div className={`space-y-3 rounded-xl border p-3 ${accepted && !done ? "border-emerald-300 bg-emerald-50/40" : "bg-background"}`}>
      <div className="flex items-start gap-2"><span className="flex-1 font-medium leading-snug">{event.title}</span>{done ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : accepted ? <Badge variant="secondary">В плане</Badge> : null}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">{event.description}</p>
      <div className="flex flex-wrap gap-1">{event.develops_skills.map(skill => <Badge key={skill.skill_id} variant="outline" className="text-[10px]">{skillName(skill.skill_id)}</Badge>)}</div>
      <div className="text-xs text-muted-foreground">{FORMAT[event.format]} · {event.duration_hours} ч{event.format !== "self_paced" && ` · ${session ? `сессия ${session}` : "дата уточняется"}`}</div>
      {done ? <p className="text-xs font-medium text-emerald-700">Выполнено · прогресс засчитан</p> : blocked ? <p className="text-xs text-muted-foreground">{blocked}</p> : <>
        <div className="flex items-center gap-1.5 text-xs">{exercise.kind === "python" ? <Code2 className="size-3.5" /> : <Lightbulb className="size-3.5" />}{exercise.kind === "python" ? "Написать код и пройти 5 проверок" : "Решить 2 рабочих ситуации"}</div>
        <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={onStart}><Play />{accepted ? "Выполнить задание" : "Взять и начать"}</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void decline()}>Не сейчас</Button></div>
      </>}
    </div>
  );
}

export default function VenuePanel({ placeId }: PanelProps) {
  const accepted = useClientStore(state => state.acceptedQuests);
  const recommendations = useClientStore(state => state.recommendations);
  const profile = useClientStore(state => state.profile);
  const employeeId = useClientStore(state => state.employeeId);
  const [selected, setSelected] = useState<DevEvent | null>(null);
  const [finished, setFinished] = useState<string[]>([]);
  const events = useEvents();
  const place = placeId ? getPlace(placeId) : undefined;
  if (!place?.eventType) return <p className="text-muted-foreground">Площадка не найдена</p>;

  const list = events.filter(event => event.type === place.eventType && (accepted.includes(event.event_id) || (profile && event.target_roles.includes(profile.employee.role) && event.target_grades.includes(profile.employee.grade))))
    .sort((a, b) => Number(accepted.includes(b.event_id)) - Number(accepted.includes(a.event_id)));

  return (
    <div className="space-y-4 text-sm">
      <div><h2 className="text-lg font-semibold">{place.name}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Выберите шаг, решите задание с подсказками и примените результат к своему прогрессу.</p></div>
      {place.eventType === "compliance" && <p className="rounded-lg bg-muted px-3 py-2 text-xs">Обязательное обучение — навыки не качает</p>}
      {profile && list.map(event => <EventRow key={`${employeeId}:${event.event_id}`} event={event} profile={profile} accepted={accepted.includes(event.event_id)} finished={finished.includes(`${employeeId}:${event.event_id}`)} onStart={() => { actions.acceptQuest(event.event_id); setSelected(event); }} />)}
      {selected && <PracticeDialog key={`${employeeId}:${selected.event_id}`} event={selected} employeeId={employeeId} recommendation={recommendations.find(rec => rec.eventId === selected.event_id)} onClose={() => setSelected(null)} onComplete={() => setFinished(previous => [...previous, `${employeeId}:${selected.event_id}`])} />}
    </div>
  );
}
