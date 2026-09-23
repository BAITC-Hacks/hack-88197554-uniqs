"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MapPin, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postProgress, skillName, useEvents } from "@/features/hud/data";
import { actions, getState, useClientStore } from "@/lib/client-store";
import { readSse } from "@/lib/sse";
import type { AgentStep, DevEvent, Profile, Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { venueForEvent } from "@/lib/world";

const short = (v: unknown, n = 120) => {
  const s = JSON.stringify(v) ?? "";
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

function StepView({ step }: { step: AgentStep }) {
  switch (step.type) {
    case "thought":
      return <p className="text-muted-foreground italic">{step.text}</p>;
    case "tool_call":
      return (
        <code className="block w-fit max-w-full truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
          → {step.tool}({short(step.input, 80)})
        </code>
      );
    case "tool_result":
      return (
        <details className="text-xs">
          <summary className="cursor-pointer truncate font-mono text-muted-foreground">
            ← {step.tool}: {short(step.output)}
          </summary>
          <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap">
            {JSON.stringify(step.output, null, 2)}
          </pre>
        </details>
      );
    case "tool_error":
      return (
        <p className="font-mono text-xs text-destructive">
          ✕ {step.tool}: {step.error}
        </p>
      );
    case "final":
      return <p className="text-xs font-medium text-emerald-700">Готово: {step.recommendations.length} шаг(а)</p>;
  }
}

// «Не сейчас» сохраняется между открытиями панели в текущей сессии.
const deferred = new Map<string, Set<string>>();
const FORMATS: Record<DevEvent["format"], string> = { online: "Онлайн", offline: "Очно", self_paced: "В своём темпе" };
const TYPES: Record<DevEvent["type"], string> = {
  course: "Курс", workshop: "Практикум", mentoring: "Менторство", certification: "Сертификация",
  meetup: "Встреча", onboarding: "Адаптация", compliance: "Обучение",
};
const sessionDate = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00Z`)
  .toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "UTC" });

function QuestCard({ rec, event, accepted, first, profile, employeeId, updating }: {
  rec: Recommendation; event?: DevEvent; accepted: boolean; first: boolean;
  profile: Profile | null; employeeId: string; updating: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const venue = event && venueForEvent(event);
  const gains = event?.develops_skills.flatMap((developed) => {
    const gap = profile?.gaps.find((item) => item.skillId === developed.skill_id);
    if (!gap) return [];
    const to = Math.min(gap.current + developed.gain, developed.max_level, gap.required);
    return to > gap.current ? [{ skillId: gap.skillId, from: gap.current, to }] : [];
  }) ?? [];

  async function decline() {
    setBusy(true);
    try {
      await postProgress({ employeeId, eventId: rec.eventId, status: "declined" });
      const skipped = deferred.get(employeeId) ?? new Set<string>();
      skipped.add(rec.eventId);
      deferred.set(employeeId, skipped);
      if (getState().employeeId !== employeeId) return;
      actions.dropQuest(rec.eventId);
      toast("Отложено, без штрафа");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Card className={cn("gap-4 shadow-none", first && "ring-emerald-200 bg-emerald-50/30")}>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-[11px] font-semibold tracking-wide uppercase", first ? "text-emerald-700" : "text-muted-foreground")}>
            {first ? "Рекомендуемый шаг" : "Ещё вариант"}
          </span>
          <Badge variant="secondary" className={accepted ? "bg-emerald-100 text-emerald-800" : ""}>
            {accepted ? <><Check />В плане</> : event ? TYPES[event.type] : "Развитие"}
          </Badge>
        </div>
        <CardTitle className="text-base font-semibold leading-snug">{rec.title}</CardTitle>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {event && <span>{FORMATS[event.format]}</span>}
          {event && <span className="flex items-center gap-1"><Clock3 className="size-3.5" />{event.duration_hours} ч</span>}
          {rec.nextSession && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{sessionDate(rec.nextSession)}</span>}
          {!rec.nextSession && event?.format !== "self_paced" && <span>Дата уточняется</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {gains.length > 0 && (
          <div className="space-y-2 rounded-lg bg-emerald-50 p-3 text-emerald-900">
            <p className="flex items-center gap-1.5 text-xs font-medium"><TrendingUp className="size-3.5" />Что даст этот шаг</p>
            {gains.map((gain) => (
              <div key={gain.skillId} className="flex items-center justify-between gap-2 text-xs">
                <span>{skillName(gain.skillId)}</span>
                <span className="shrink-0 font-semibold tabular-nums">{gain.from} → {gain.to} <span className="ml-1 rounded bg-white px-1.5 py-0.5">+{gain.to - gain.from}</span></span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1">
          <p className="text-xs font-medium">Почему подходит</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{rec.explanation}</p>
        </div>
        <details className="group text-xs">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />Факторы выбора · {rec.factors.length}
          </summary>
          <ul className="mt-2 space-y-2 border-l-2 border-emerald-100 pl-3">
            {rec.factors.map((factor, index) => <li key={index} className={factor.weight < 0 ? "text-amber-700" : "text-muted-foreground"}>{factor.text}</li>)}
          </ul>
        </details>
        {venue && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" />{venue.name}</p>}
        <div className="flex flex-wrap items-center gap-1 border-t pt-3">
          <Button
            className={cn("flex-1", first && "bg-emerald-700 text-white hover:bg-emerald-800")}
            disabled={busy || updating || (accepted && !venue)}
            onClick={() => {
              if (getState().employeeId !== employeeId) return;
              if (accepted && venue) { actions.travelTo(venue.id); return; }
              actions.acceptQuest(rec.eventId);
              toast.success(`Добавлено в план: ${rec.title}`);
            }}
          >
            {accepted ? <>К активности<ArrowRight /></> : "Добавить в план"}
          </Button>
          <Button variant="ghost" disabled={busy || updating} onClick={decline}>
            Не сейчас
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MentorPanel() {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [streaming, setStreaming] = useState(true);
  const [revision, setRevision] = useState(0);
  const employeeId = useClientStore((s) => s.employeeId);
  const profile = useClientStore((s) => s.profile);
  const lastDelta = useClientStore((s) => s.lastDelta);
  const recommendations = useClientStore((s) => s.recommendations);
  const accepted = useClientStore((s) => s.acceptedQuests);
  const events = useEvents();

  useEffect(() => {
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && getState().employeeId === employeeId;
    async function load() {
      setSteps([]);
      setStreaming(true);
      let finished = false;
      try {
        const res = await fetch("/api/mentor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId }),
          signal: controller.signal,
        });
        await readSse(res, (step) => {
          if (!current()) return;
          setSteps((prev) => [...prev, step]);
          if (step.type === "final") {
            finished = true;
            actions.setRecommendations(step.recommendations.filter((rec) => !deferred.get(employeeId)?.has(rec.eventId)));
          }
        });
        if (current() && !finished) throw new Error("Подбор не завершился. Попробуйте обновить рекомендации.");
      } catch (error) {
        if (current()) setSteps((prev) => [...prev, { type: "tool_error", tool: "mentor", error: error instanceof Error ? error.message : String(error) }]);
      } finally {
        if (current()) setStreaming(false);
      }
    }
    // Отложенный старт позволяет cleanup StrictMode отменить первый запуск до запроса.
    const start = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(start); controller.abort(); };
  }, [employeeId, lastDelta, revision]);

  const latestThought = steps.findLast((step) => step.type === "thought");
  const error = steps.findLast((step) => step.type === "tool_error");
  const offline = steps.some((step) => step.type === "thought" && step.text.startsWith("Офлайн-режим"));
  const target = profile?.employee.employee_id === employeeId ? profile.target : null;

  return (
    <div className="space-y-5 text-sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700"><Sparkles className="size-4" />Карьерный наставник</div>
        <h2 className="text-xl font-semibold tracking-tight">Твой следующий шаг</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {target ? `К цели ${target.role} · ${target.grade}. ` : "Шаги для твоего развития. "}
          Выбери подходящее и добавь в свой план.
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <p role="status" className="text-xs text-muted-foreground">
          {streaming ? "Подбираю шаги…" : offline ? "Подбор по профилю · офлайн" : error ? "Подбор требует внимания" : `Для тебя · ${recommendations.length}`}
        </p>
        <Button size="xs" variant="ghost" disabled={streaming} onClick={() => setRevision((value) => value + 1)}>
          <RefreshCw className={streaming ? "animate-spin" : ""} />Обновить
        </Button>
      </div>
      {streaming && <p className="text-xs text-muted-foreground" aria-live="polite">{latestThought?.type === "thought" ? latestThought.text : "Сверяю цель, навыки и историю участия…"}</p>}
      {error?.type === "tool_error" && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{error.error} {recommendations.length > 0 && "Доступные карточки сохранены."}</p>
      )}

      {recommendations.map((r, index) => (
        <QuestCard
          key={`${employeeId}:${r.eventId}`}
          rec={r}
          event={events.find((e) => e.event_id === r.eventId)}
          accepted={accepted.includes(r.eventId)}
          first={index === 0}
          profile={profile?.employee.employee_id === employeeId ? profile : null}
          employeeId={employeeId}
          updating={streaming}
        />
      ))}
      {steps.length > 0 && (
        <details className="group border-t pt-3 text-xs">
          <summary className="flex cursor-pointer list-none items-center justify-between text-muted-foreground hover:text-foreground">
            Как подобраны шаги<ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-2 rounded-lg bg-muted/40 p-3">
            {steps.map((step, index) => <StepView key={index} step={step} />)}
          </div>
        </details>
      )}
    </div>
  );
}
