"use client";

import { useState } from "react";
import { Check, CheckCircle2, Code2, Lightbulb, Play, Sparkles, Target, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { skillName } from "@/features/hud/data";
import { actions, getState } from "@/lib/client-store";
import type { DevEvent, Recommendation } from "@/lib/types";
import { exerciseFor, PYTHON_STARTER, type PracticeResult } from "./exercises";

interface Draft { code: string; answers: number[]; hints: number }
const drafts = new Map<string, Draft>();

function initials(name: string): string {
  const words = name.split(/\s+/);
  const letters = words.length > 1 ? words.map(word => word[0]) : [name[0], name.slice(1).match(/[A-Z]/)?.[0] ?? ""];
  return letters.join("").slice(0, 2).toUpperCase();
}

export default function PracticeDialog({ event, employeeId, recommendation, onClose, onComplete }: {
  event: DevEvent;
  employeeId: string;
  recommendation?: Recommendation;
  onClose: () => void;
  onComplete: () => void;
}) {
  const exercise = exerciseFor(event);
  const draftKey = `${employeeId}:${event.event_id}`;
  const [draft, setDraft] = useState<Draft>(() => drafts.get(draftKey) ?? { code: PYTHON_STARTER, answers: exercise.questions.map(() => -1), hints: 0 });
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saved = Boolean(result?.delta);

  function update(patch: Partial<Draft>, invalidate = true) {
    const next = { ...draft, ...patch };
    drafts.set(draftKey, next);
    setDraft(next);
    if (invalidate) { setResult(null); setError(""); }
  }

  async function check(complete = false) {
    if (busy || saved) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/venues/practice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, eventId: event.event_id, code: draft.code, answers: draft.answers, complete }),
      });
      const data = await response.json() as PracticeResult;
      if (!response.ok) throw new Error(data.error ?? "Не удалось проверить решение. Попробуйте ещё раз.");
      if (getState().employeeId !== employeeId) return;
      setResult(data);
      if (data.delta) {
        actions.applyDelta(data.delta);
        drafts.delete(draftKey);
        onComplete();
        toast.success("Задание выполнено — прогресс обновлён");
        if (data.delta.gradeReady) toast.success("Готов к разговору о повышении");
      }
    } catch (error) { setError(error instanceof Error ? error.message : "Не удалось проверить решение."); }
    finally { setBusy(false); }
  }

  const canCheck = exercise.kind === "python" ? draft.code.trim().length > 0 : draft.answers.every(answer => answer >= 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="pointer-events-auto flex max-h-[90vh] w-[1080px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1080px]" showCloseButton={!busy}>
        <div className="border-b px-7 py-5">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initials(exercise.company.name)}</span>
            <div className="min-w-0"><div className="text-sm font-semibold">Задание от {exercise.company.name}</div><p className="text-xs text-muted-foreground">{exercise.company.about}</p></div>
          </div>
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">Практическое задание</Badge><span>5 минут · {exercise.kind === "python" ? "Python" : "Рабочий кейс"}</span>
          </div>
          <DialogTitle className="pr-8 text-2xl font-semibold">{exercise.title}</DialogTitle>
          <DialogDescription className="mt-2">{event.title} · короткая демо-практика по теме активности</DialogDescription>
        </div>

        {saved ? (
          <div className="space-y-6 px-10 py-10">
            <div className="flex items-center gap-4"><CheckCircle2 className="size-12 text-emerald-600" /><div><h3 className="text-2xl font-semibold">Шаг выполнен!</h3><p className="mt-1 text-muted-foreground">{exercise.takeaway}</p></div></div>
            <div className="flex flex-wrap gap-3">
              {result?.delta?.skills.filter(skill => skill.to > skill.from).map(skill => <div key={skill.skillId} className="rounded-xl border bg-emerald-50 px-5 py-3"><div className="text-sm">{skillName(skill.skillId)}</div><div className="mt-1 text-xl font-semibold">{skill.from} → {skill.to} <span className="text-sm text-emerald-700">+{skill.to - skill.from}</span></div></div>)}
            </div>
            <p>Требований к цели закрыто: <strong>{result?.delta?.gradeProgress.after.met} из {result?.delta?.gradeProgress.after.total}</strong>. Следующий шаг можно обсудить с наставником.</p>
            <div className="flex gap-3"><Button onClick={onClose}>Вернуться к заданиям</Button><Button variant="outline" onClick={() => { onClose(); actions.openPanel("mentor", "mentor"); }}><Sparkles />К наставнику</Button></div>
          </div>
        ) : (
          <>
            <div className="grid min-h-0 grid-cols-[340px_1fr] overflow-y-auto">
              <aside className="space-y-5 border-r bg-muted/25 p-6">
                <div><h3 className="mb-2 flex items-center gap-2 font-semibold"><Target className="size-4" />Задача</h3><p className="text-sm leading-relaxed">{exercise.brief}</p></div>
                {exercise.kind === "python" && <div className="rounded-lg border bg-background p-3 font-mono text-xs leading-6"><div>Вход: [100, -50, 200, 0]</div><div>Результат: 300</div><div className="mt-1 font-sans text-muted-foreground">100 + 200; списание −50 пропускаем.</div></div>}
                <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Навыки этой активности</h3><div className="flex flex-wrap gap-1.5">{event.develops_skills.map(skill => <Badge key={skill.skill_id} variant="outline">{skillName(skill.skill_id)}</Badge>)}</div></div>
                {recommendation && <div className="rounded-lg border bg-background p-3"><h3 className="mb-2 flex items-center gap-2 font-medium"><Sparkles className="size-4" />Почему этот шаг</h3><ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">{recommendation.factors.map((factor, i) => <li key={i}>{factor.text}</li>)}</ul></div>}
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-amber-700" />Совет наставника</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">Подсказки открываются постепенно. Их использование не уменьшает прогресс.</p>
                  {exercise.hints.slice(0, draft.hints).map((hint, i) => <p key={hint} className="text-sm leading-relaxed"><span className="font-semibold">{i + 1}. </span>{hint}</p>)}
                  <Button size="sm" variant="outline" disabled={busy || draft.hints >= exercise.hints.length} onClick={() => update({ hints: draft.hints + 1 }, false)}>{draft.hints === 0 ? "Получить подсказку" : draft.hints < exercise.hints.length ? "Ещё подсказка" : "Все подсказки открыты"}</Button>
                </div>
              </aside>

              <div className="space-y-4 p-6">
                {exercise.kind === "python" ? (
                  <div className="overflow-hidden rounded-xl border">
                    <div className="flex items-center gap-2 border-b bg-muted px-4 py-2.5 text-xs"><Code2 className="size-4" /><span className="font-mono">solution.py</span><span className="ml-auto text-muted-foreground">Tab — отступ · Ctrl/⌘ Enter — проверить</span></div>
                    <textarea aria-label="Код решения на Python" spellCheck={false} autoCapitalize="off" autoCorrect="off" disabled={busy} maxLength={6000} value={draft.code}
                      className="block h-[270px] w-full resize-none bg-slate-950 p-4 font-mono text-[14px] leading-7 text-slate-100 outline-none selection:bg-emerald-800 disabled:opacity-70"
                      onChange={event => update({ code: event.target.value })}
                      onKeyDown={event => {
                        if (event.key === "Tab") {
                          event.preventDefault();
                          const target = event.currentTarget; const start = target.selectionStart; const end = target.selectionEnd;
                          update({ code: draft.code.slice(0, start) + "    " + draft.code.slice(end) });
                          requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 4; });
                        }
                        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void check(); }
                      }} />
                    <div className="border-t bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">Учебный Python: <code>def, for, if/else, return, +=</code>, числа, списки, списковые включения, <code>sum, len, min, max, abs</code>. Без импортов и внешних библиотек.</div>
                  </div>
                ) : exercise.questions.map((question, i) => (
                  <fieldset key={question.prompt} disabled={busy} className="space-y-3 rounded-xl border p-4">
                    <legend className="px-1 text-xs font-semibold text-muted-foreground">СИТУАЦИЯ {i + 1} ИЗ {exercise.questions.length}</legend>
                    <p className="font-medium leading-relaxed">{question.prompt}</p>
                    {question.options.map((option, j) => <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm leading-relaxed ${draft.answers[i] === j ? "border-emerald-500 bg-emerald-50" : "hover:bg-muted/50"}`}><input type="radio" name={`question-${i}`} className="mt-1 accent-emerald-600" checked={draft.answers[i] === j} onChange={() => update({ answers: draft.answers.map((answer, index) => index === i ? j : answer) })} /><span>{option}</span></label>)}
                  </fieldset>
                ))}
                <div aria-live="polite" className="space-y-2">
                  {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
                  {result && <><div className="flex items-center justify-between text-sm font-medium"><span>{result.passed ? "Решение принято" : "Попробуйте ещё раз"}</span><span>{result.checks.filter(check => check.passed).length}/{result.checks.length} проверок</span></div>{result.checks.map((check, i) => <div key={i} className={`flex items-start gap-2 rounded-lg border p-3 ${check.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>{check.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />}<div><p className="text-xs font-semibold">{check.label}</p><p className="mt-1 break-words text-xs leading-relaxed">{check.detail}</p></div></div>)}</>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t bg-background px-7 py-4">
              <Button variant="ghost" disabled={busy} onClick={onClose}>Не сейчас · сохранить черновик</Button>
              <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">{result?.passed ? "Можно засчитать шаг" : "Прогресс после успешной проверки"}</span>{result?.passed ? <Button disabled={busy} onClick={() => void check(true)}><Check />{busy ? "Сохраняем…" : "Засчитать выполнение"}</Button> : <Button disabled={busy || !canCheck} onClick={() => void check()}><Play />{busy ? "Проверяем…" : "Проверить решение"}</Button>}</div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
