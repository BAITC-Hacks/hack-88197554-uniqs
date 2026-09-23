"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postProgress, useEvents } from "@/features/hud/data";
import { actions, getState, useClientStore } from "@/lib/client-store";
import { readSse } from "@/lib/sse";
import type { AgentStep, DevEvent, Recommendation } from "@/lib/types";
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

function QuestCard({ rec, event, accepted }: { rec: Recommendation; event?: DevEvent; accepted: boolean }) {
  const [busy, setBusy] = useState(false);

  async function decline() {
    setBusy(true);
    try {
      await postProgress({ employeeId: getState().employeeId, eventId: rec.eventId, status: "declined" });
      actions.dropQuest(rec.eventId);
      toast("Отложено, без штрафа");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{rec.title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {event ? venueForEvent(event).name : "…"} · {rec.nextSession ?? "в своём темпе"}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {rec.factors.map((f, i) => (
            <Badge key={i} variant={f.weight >= 0 ? "default" : "destructive"} className="h-auto whitespace-normal">
              {f.text}
            </Badge>
          ))}
        </div>
        <p className="text-sm">{rec.explanation}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={accepted || busy}
            onClick={() => {
              actions.acceptQuest(rec.eventId);
              toast.success(`Квест взят: ${rec.title}`);
            }}
          >
            {accepted ? "Взято" : "Взять"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={decline}>
            Не сейчас
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MentorPanel() {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [streaming, setStreaming] = useState(false);
  const recommendations = useClientStore((s) => s.recommendations);
  const accepted = useClientStore((s) => s.acceptedQuests);
  const events = useEvents();

  async function talk() {
    setSteps([]);
    setStreaming(true);
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: getState().employeeId }),
      });
      await readSse(res, (step) => {
        setSteps((prev) => [...prev, step]);
        if (step.type === "final") actions.setRecommendations(step.recommendations);
      });
    } catch (e) {
      setSteps((prev) => [...prev, { type: "tool_error", tool: "mentor", error: e instanceof Error ? e.message : String(e) }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="text-lg font-semibold">Юрта наставника</h2>
        <p className="text-muted-foreground">AI-наставник подберёт 1–3 следующих шага и объяснит выбор.</p>
      </div>
      <Button onClick={talk} disabled={streaming}>
        {streaming ? "Наставник думает…" : "Поговорить"}
      </Button>

      {steps.length > 0 && (
        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-2">
          {steps.map((s, i) => (
            <StepView key={i} step={s} />
          ))}
        </div>
      )}

      {recommendations.map((r) => (
        <QuestCard
          key={r.eventId}
          rec={r}
          event={events.find((e) => e.event_id === r.eventId)}
          accepted={accepted.includes(r.eventId)}
        />
      ))}
    </div>
  );
}
