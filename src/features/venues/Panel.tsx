"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { nextSession, postProgress, skillName, useEvents } from "@/features/hud/data";
import { actions, getState, useClientStore } from "@/lib/client-store";
import type { DevEvent, PanelProps } from "@/lib/types";
import { getPlace } from "@/lib/world";

const FORMAT: Record<DevEvent["format"], string> = { online: "онлайн", offline: "офлайн", self_paced: "в своём темпе" };

function EventRow({ event, accepted }: { event: DevEvent; accepted: boolean }) {
  const [busy, setBusy] = useState(false);
  const session = nextSession(event);

  async function complete() {
    setBusy(true);
    try {
      const delta = await postProgress({ employeeId: getState().employeeId, eventId: event.event_id, status: "completed" });
      actions.applyDelta(delta);
      for (const s of delta.skills) {
        if (s.to > s.from) toast.success(`+${s.to - s.from} ${skillName(s.skillId)}`);
      }
      if (delta.gradeReady) toast.success("Готов к разговору о повышении");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1 rounded-lg border p-2">
      <div className="flex items-start gap-2">
        <span className="flex-1 font-medium">{event.title}</span>
        {event.mandatory && <Badge variant="outline">обязательное</Badge>}
      </div>
      <div className="text-xs text-muted-foreground">
        {FORMAT[event.format]} · {event.duration_hours} ч
        {event.format !== "self_paced" && ` · ${session ? `ближайшая ${session}` : "сессий нет"}`}
      </div>
      {accepted && (
        <Button size="sm" disabled={busy} onClick={complete}>
          Выполнено
        </Button>
      )}
    </div>
  );
}

export default function VenuePanel({ placeId }: PanelProps) {
  const accepted = useClientStore((s) => s.acceptedQuests);
  const events = useEvents();
  const place = placeId ? getPlace(placeId) : undefined;
  if (!place?.eventType) return <p className="text-muted-foreground">Площадка не найдена</p>;

  const list = events.filter((e) => e.type === place.eventType);

  return (
    <div className="space-y-3 text-sm">
      <h2 className="text-lg font-semibold">{place.name}</h2>
      {place.eventType === "compliance" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs">Обязательное обучение — навыки не качает</p>
      )}
      {list.map((e) => (
        <EventRow key={e.event_id} event={e} accepted={accepted.includes(e.event_id)} />
      ))}
    </div>
  );
}
