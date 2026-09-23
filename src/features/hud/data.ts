"use client";

// Общие клиентские помощники для панелей: каталог активностей, имена навыков, POST /api/progress.

import { useEffect, useState } from "react";
import type { DevEvent, ProgressDelta, ProgressRequest, SkillId } from "@/lib/types";

/** «сегодня» датасета */
export const TODAY = "2026-10-01";

let eventsCache: DevEvent[] | null = null;
let eventsPending: Promise<DevEvent[]> | null = null;

function loadEvents(): Promise<DevEvent[]> {
  eventsPending ??= fetch("/api/events")
    .then((r) => (r.ok ? (r.json() as Promise<DevEvent[]>) : Promise.reject(new Error(String(r.status)))))
    .then((events) => (eventsCache = events))
    .catch(() => {
      eventsPending = null;
      return [];
    });
  return eventsPending;
}

/** каталог /api/events, грузится один раз на вкладку */
export function useEvents(): DevEvent[] {
  const [events, setEvents] = useState<DevEvent[]>(eventsCache ?? []);
  useEffect(() => {
    if (!eventsCache) void loadEvents().then(setEvents);
  }, []);
  return events;
}

/** ближайшая сессия не раньше TODAY; null — в своём темпе или сессий нет */
export function nextSession(event: DevEvent): string | null {
  return [...event.upcoming_sessions].sort().find((d) => d >= TODAY) ?? null;
}

const WORDS: Record<string, string> = {
  SQL: "SQL", API: "API", CICD: "CI/CD", HTML: "HTML", CSS: "CSS", AB: "A/B", BI: "BI", ML: "ML",
  UX: "UX", CRM: "CRM", HR: "HR", MGMT: "Management", VIZ: "Visualization", JAVASCRIPT: "JavaScript",
  TYPESCRIPT: "TypeScript",
};

/** SK_SYSTEM_DESIGN → «System Design» */
export function skillName(id: SkillId): string {
  return id
    .replace(/^SK_/, "")
    .split("_")
    .map((w) => WORDS[w] ?? w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export async function postProgress(req: ProgressRequest): Promise<ProgressDelta> {
  const res = await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`progress failed: ${res.status}`);
  return (await res.json()) as ProgressDelta;
}
