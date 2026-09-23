"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEvents } from "@/features/hud/data";
import { actions, useClientStore } from "@/lib/client-store";
import { venueForEvent } from "@/lib/world";
import { eventIndex, formatXp, xpForRecord } from "./xp";

export default function QuestsPanel() {
  const accepted = useClientStore((s) => s.acceptedQuests);
  const recommendations = useClientStore((s) => s.recommendations);
  const events = useEvents();
  const open = recommendations.filter((r) => !accepted.includes(r.eventId));
  const profile = useClientStore((s) => s.profile);
  const byId = eventIndex(events);
  // выполненные добровольные шаги с опытом, свежие сверху
  const done = (profile?.history ?? [])
    .map((h) => ({ h, xp: xpForRecord(byId.get(h.event_id), h).total }))
    .filter((d) => d.xp > 0)
    .sort((a, b) => b.h.date.localeCompare(a.h.date) || b.h.record_id.localeCompare(a.h.record_id))
    .slice(0, 5);

  return (
    <div className="space-y-4 text-sm">
      <h2 className="text-lg font-semibold">Мой план</h2>

      {accepted.length === 0 && open.length === 0 && (
        <p className="text-muted-foreground">Поговорите с наставником в юрте</p>
      )}

      {accepted.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Выбранные шаги</div>
          {accepted.map((id) => {
            const event = events.find((e) => e.event_id === id);
            const title = recommendations.find((r) => r.eventId === id)?.title ?? event?.title ?? id;
            const venue = event && venueForEvent(event);
            return (
              <div key={id} className="flex items-center gap-2 rounded-lg border p-2">
                <div className="flex-1">
                  <div>{title}</div>
                  {venue && <div className="text-xs text-muted-foreground">{venue.name}</div>}
                </div>
                <Button size="sm" disabled={!venue} onClick={() => venue && actions.travelTo(venue.id)}>
                  Идти
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {open.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="font-medium">Предложены наставником</div>
            {open.map((r) => (
              <div key={r.eventId} className="flex items-center gap-2 rounded-lg border border-dashed p-2">
                <span className="flex-1">{r.title}</span>
                <Button size="sm" variant="outline" onClick={() => actions.acceptQuest(r.eventId)}>
                  Взять
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="font-medium">Выполнено</div>
            {done.map(({ h, xp }) => (
              <div key={h.record_id} className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2">
                <div className="flex-1">
                  <div>{byId.get(h.event_id)?.title ?? h.event_id}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{h.date}</div>
                </div>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-800">+{formatXp(xp)} XP</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
