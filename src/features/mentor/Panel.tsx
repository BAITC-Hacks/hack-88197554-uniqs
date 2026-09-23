"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MapPin, Send, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { postProgress, skillName, TODAY, useEvents } from "@/features/hud/data";
import { actions, getState, useClientStore } from "@/lib/client-store";
import { readSse } from "@/lib/sse";
import type { AgentStep, DevEvent, Profile, Recommendation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { venueForEvent } from "@/lib/world";
import type { ChatMessage, MentorFinal } from "./chat";
import { clearMentorDraft, mentorDraft } from "./questions";
import { KnowledgeGuide } from "@/features/knowledge/Guide";

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
const conversations = new Map<string, ChatMessage[]>();
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
  const [declined, setDeclined] = useState(() => deferred.get(employeeId)?.has(rec.eventId) ?? false);
  const completed = profile?.history.some((record) => record.event_id === rec.eventId && record.status === "completed"
    && (rec.eventId !== "EV_036" || record.date.slice(0, 10) === TODAY));
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
      setDeclined(true);
      toast("Отложено, без штрафа");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (declined || completed) return (
    <p className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">{completed ? "✓ Выполнено" : "Отложено"} · {rec.title}</p>
  );

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
              if (!getState().recommendations.some((item) => item.eventId === rec.eventId)) {
                actions.setRecommendations([...getState().recommendations, rec]);
              }
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
  const employeeId = useClientStore((s) => s.employeeId);
  return <MentorChat key={employeeId} employeeId={employeeId} />;
}

function MentorChat({ employeeId }: { employeeId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => conversations.get(employeeId) ?? [{
    id: "welcome", role: "assistant",
    content: "Привет! Я помогу разобраться в твоём профиле, выбрать обучение и понять, как устроен Career Quest. Если каталог не закрывает нужный навык, обсудим рабочую практику и вопросы руководителю. С чего начнём?",
  }]);
  const messagesRef = useRef(messages);
  const [draft, setDraft] = useState(() => mentorDraft(employeeId));
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [streaming, setStreaming] = useState(false);
  const request = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement | null>(null);
  const profile = useClientStore((s) => s.profile);
  const accepted = useClientStore((s) => s.acceptedQuests);
  const events = useEvents();

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { clearMentorDraft(employeeId); }, [employeeId]);
  useEffect(() => {
    const view = transcript.current;
    if (!view) return;
    const last = view.querySelectorAll<HTMLElement>("[data-chat-message]").item(messages.length - 1);
    if (messages.at(-1)?.role === "assistant" && last) {
      view.scrollTop += last.getBoundingClientRect().top - view.getBoundingClientRect().top - 8;
    } else view.scrollTop = view.scrollHeight;
  }, [messages, streaming]);

  function save(next: ChatMessage[]) {
    messagesRef.current = next;
    conversations.set(employeeId, next);
    setMessages(next);
  }

  async function send(value: string) {
    const content = value.trim();
    if (!content || content.length > 2000 || request.current || getState().employeeId !== employeeId) return;
    const controller = new AbortController();
    request.current = controller;
    const current = () => !controller.signal.aborted && getState().employeeId === employeeId;
    const conversation: ChatMessage[] = [...messagesRef.current, { id: crypto.randomUUID(), role: "user", content }];
    save(conversation);
    setDraft("");
    setSteps([]);
    setStreaming(true);
    let finished = false;
    const received: AgentStep[] = [];
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          excludedEventIds: [...(deferred.get(employeeId) ?? [])],
          messages: conversation.filter((message) => message.id !== "welcome"
            && (message.role === "user" || message.mode === "openai")).slice(-12).map((message) => ({
            role: message.role,
            content: (message.content + (message.recommendations?.length
              ? `\nПредложенные карточки: ${message.recommendations.map((rec, index) => `${index + 1}. ${rec.title} (${rec.eventId})`).join("; ")}` : "")).slice(0, 4000),
          })),
        }),
        signal: controller.signal,
      });
      await readSse(res, (step) => {
        if (!current()) return;
        received.push(step);
        setSteps([...received]);
        if (step.type === "final" && !finished) {
          finished = true;
          const final = step as MentorFinal;
          const recommendations = final.recommendations.filter((rec) => !deferred.get(employeeId)?.has(rec.eventId));
          save([...conversation, {
            id: crypto.randomUUID(), role: "assistant", content: final.message || "Вот подходящие шаги развития.",
            recommendations, mode: final.mode, steps: [...received],
          }]);
          if (recommendations.length) {
            const retained = getState().recommendations.filter((rec) => getState().acceptedQuests.includes(rec.eventId));
            actions.setRecommendations([...new Map([...retained, ...recommendations].map((rec) => [rec.eventId, rec])).values()]);
          }
        }
      });
      if (current() && !finished) throw new Error("Ответ не завершился. Отправь сообщение ещё раз.");
    } catch (error) {
      if (current() && !finished) save([...conversation, {
        id: crypto.randomUUID(), role: "assistant",
        content: error instanceof Error ? error.message : "Не удалось получить ответ. Попробуй ещё раз.",
      }]);
    } finally {
      if (current()) setStreaming(false);
      if (request.current === controller) request.current = null;
    }
  }

  const latestThought = steps.findLast((step) => step.type === "thought");
  const mode = messages.findLast((message) => message.mode)?.mode;
  const target = profile?.employee.employee_id === employeeId ? profile.target : null;

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-96 flex-col text-sm">
      <header className="shrink-0 space-y-2 border-b pb-3">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-emerald-700" />Карьерный наставник</h2>
        <p className="text-xs text-muted-foreground">{target ? `${target.role} → ${target.grade}` : "Твой чат о развитии"}</p>
        {mode === "offline" && <p className="text-[11px] text-amber-700">База знаний и подбор по правилам · без AI</p>}
        {mode === "fallback" && <p className="text-[11px] text-amber-700">AI недоступен · ответ по базе знаний и данным профиля</p>}
        {mode === "openai" && <p className="text-[11px] text-emerald-700">Ответы OpenAI</p>}
        <KnowledgeGuide />
      </header>

      <div ref={transcript} role="log" aria-label="Диалог с наставником" className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4 pr-1">
        {messages.map((message) => (
          <div key={message.id} data-chat-message className={cn("space-y-3", message.role === "user" && "ml-8")}>
            <div className={cn("rounded-2xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap break-words",
              message.role === "user" ? "rounded-br-sm bg-emerald-700 text-white" : "rounded-bl-sm bg-muted/70")}>
              <p className={cn("mb-1 text-[10px] font-semibold", message.role === "user" ? "text-emerald-100" : "text-muted-foreground")}>{message.role === "user" ? "Ты" : "Наставник"}</p>
              {message.content}
            </div>
            {message.steps?.some((step) => step.type === "tool_error") && (
              <p role="alert" className="text-xs text-amber-700">{message.steps.filter((step) => step.type === "tool_error").map((step) => step.error).join(" ")}</p>
            )}
            {message.recommendations?.map((rec, index) => (
              <QuestCard key={rec.eventId} rec={rec} event={events.find((event) => event.event_id === rec.eventId)}
                accepted={accepted.includes(rec.eventId)} first={index === 0}
                profile={profile?.employee.employee_id === employeeId ? profile : null}
                employeeId={employeeId} updating={streaming} />
            ))}
            {message.steps && (
              <details className="group text-xs">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground"><ChevronDown className="size-3.5 group-open:rotate-180" />Как получен ответ</summary>
                <div className="mt-2 space-y-2 rounded-lg bg-muted/40 p-2">{message.steps.map((step, index) => <StepView key={index} step={step} />)}</div>
              </details>
            )}
          </div>
        ))}
        {streaming && <p role="status" className="text-xs text-muted-foreground">{latestThought?.type === "thought" ? latestThought.text : "Наставник готовит ответ…"}</p>}
      </div>

      <form className="shrink-0 space-y-2 border-t bg-white pt-3" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
        {messages.length === 1 && <div className="flex flex-wrap gap-1.5">
          {["С чего начать?", "Что есть в экосистеме?", "Какие пробелы в моём профиле?", "Какой рабочий проект обсудить?"].map((text) => (
            <Button key={text} type="button" size="xs" variant="outline" onClick={() => void send(text)} disabled={streaming}>{text}</Button>
          ))}
        </div>}
        <div className="flex items-end gap-2 rounded-xl border p-2 focus-within:ring-2 focus-within:ring-emerald-200">
          <textarea aria-label="Сообщение наставнику" placeholder="Напиши цель или задай вопрос…" rows={2} maxLength={2000}
            value={draft} onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault(); void send(draft);
              }
            }}
            className="max-h-32 min-h-12 min-w-0 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <Button type="submit" size="icon" aria-label="Отправить сообщение" disabled={streaming || !draft.trim()}
            className="bg-emerald-700 text-white hover:bg-emerald-800"><Send /></Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Enter — отправить · Shift + Enter — новая строка</p>
      </form>
    </div>
  );
}
