"use client";

import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateLabel, fieldClass } from "./client";
import type { Candidate, HrWorkspace, PlanStep, PlanView } from "./types";

export function PlanSteps({ plan, data, busy, onComplete }: { plan: PlanView; data: HrWorkspace; busy: boolean; onComplete: (id: string) => void }) {
  return <ol className="my-5 space-y-3">{plan.steps.map((step, i) => {
    const done = plan.completedEventIds.includes(step.eventId);
    return <li key={step.eventId} className="flex gap-3"><span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${done ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{done ? <Check className="size-3" /> : i + 1}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{step.kind === "task" ? step.title : data.events.find((e) => e.event_id === step.eventId)?.title ?? step.eventId}</p>{step.description && <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.description}</p>}<p className="mt-1 text-xs text-slate-500">{done ? "Завершено" : `До ${dateLabel(step.dueDate)}`}{step.kind === "task" ? ` · Практический шаг · ${step.hours} ч` : ""}</p>{step.kind === "task" && !done && plan.response === "accepted" && data.account.role === "employee" && <Button className="mt-2" size="sm" variant="outline" disabled={busy} onClick={() => onComplete(step.eventId)}>Отметить выполнение</Button>}</div></li>;
  })}</ol>;
}

export function PlanStepsEditor({ steps, onChange, data, candidates, plan }: { steps: PlanStep[]; onChange: (steps: PlanStep[]) => void; data: HrWorkspace; candidates: Candidate[]; plan?: PlanView }) {
  function update(id: string, patch: Partial<PlanStep>) { onChange(steps.map((s) => s.eventId === id ? { ...s, ...patch } : s)); }
  function move(index: number, offset: number) {
    const ordered = [...steps];
    [ordered[index], ordered[index + offset]] = [ordered[index + offset], ordered[index]];
    onChange(ordered);
  }
  return <section className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="font-semibold">Шаги плана · {steps.length} / 12</h3><Button type="button" variant="outline" disabled={steps.length >= 12} onClick={() => {
      const date = new Date(`${data.asOf}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 14);
      onChange([...steps, { eventId: `task:${crypto.randomUUID()}`, kind: "task", title: "Практическое задание", description: "", hours: 1, dueDate: date.toISOString().slice(0, 10) }]);
    }}><Plus />Добавить свой шаг</Button></div>
    <ol className="space-y-3">{steps.map((step, index) => {
      const done = plan?.completedEventIds.includes(step.eventId) ?? false;
      const title = step.kind === "task" ? step.title : data.events.find((e) => e.event_id === step.eventId)?.title ?? step.eventId;
      const candidate = candidates.find((c) => c.eventId === step.eventId);
      const original = plan?.steps.find((s) => s.eventId === step.eventId);
      const minDate = [data.asOf, candidate?.nextSession?.slice(0, 10) ?? data.asOf].sort().at(-1)!;
      return <li key={step.eventId} className={`space-y-3 rounded-xl border p-4 ${done ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50"}`}>
        <div className="flex items-center gap-2"><span className="mr-auto text-xs font-medium text-slate-500">Шаг {index + 1} · {done ? "Выполнен" : step.kind === "task" ? "Практика или встреча" : "Активность из каталога"}</span><Button type="button" variant="ghost" size="icon" disabled={index === 0} aria-label={`Выше: ${title}`} onClick={() => move(index, -1)}><ArrowUp /></Button><Button type="button" variant="ghost" size="icon" disabled={index === steps.length - 1} aria-label={`Ниже: ${title}`} onClick={() => move(index, 1)}><ArrowDown /></Button><Button type="button" variant="ghost" size="icon" disabled={done} aria-label={`Удалить шаг ${title}`} onClick={() => onChange(steps.filter((s) => s.eventId !== step.eventId))}><X /></Button></div>
        {step.kind === "task" ? <>
          <label className="block text-xs text-slate-500">Название шага<input required disabled={done} maxLength={200} className={`${fieldClass} mt-1`} value={step.title ?? ""} onChange={(e) => update(step.eventId, { title: e.target.value })} /></label>
          <label className="block text-xs text-slate-500">Задание и ожидаемый результат<textarea required disabled={done} maxLength={1500} className={`${fieldClass} mt-1 h-24 py-2`} value={step.description ?? ""} onChange={(e) => update(step.eventId, { description: e.target.value })} /></label>
        </> : <p className="text-sm font-semibold">{title}</p>}
        <div className="flex gap-3"><label className="flex-1 text-xs text-slate-500">Завершить до<input type="date" required disabled={done} min={original && original.dueDate < minDate ? original.dueDate : minDate} value={step.dueDate} onChange={(e) => update(step.eventId, { dueDate: e.target.value })} className={`${fieldClass} mt-1`} /></label>{step.kind === "task" && <label className="w-28 text-xs text-slate-500">Часов<input type="number" min={0.25} max={80} step={0.25} required disabled={done} value={step.hours ?? 1} onChange={(e) => update(step.eventId, { hours: Number(e.target.value) })} className={`${fieldClass} mt-1`} /></label>}</div>
        {step.kind === "task" && <label className="block text-xs text-slate-500">Развиваемый навык<select disabled={done} className={`${fieldClass} mt-1`} value={step.skillId ?? ""} onChange={(e) => update(step.eventId, { skillId: e.target.value || undefined })}><option value="">Без привязки к навыку</option>{data.skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>}
        {done && <p className="text-xs text-emerald-800">Выполненный шаг сохранится вместе с прогрессом. Для нового задания добавьте отдельный шаг.</p>}
      </li>;
    })}</ol>
    <p className="text-xs text-slate-400">Меняйте порядок стрелками. Практика фиксируется в плане и не начисляет навыки автоматически.</p>
  </section>;
}
