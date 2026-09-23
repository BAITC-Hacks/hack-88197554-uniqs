"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, ArrowUpRight, BookOpen, Check, Clock3, Pencil, Plus, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dateLabel, fieldClass, hrRequest } from "./client";
import { PlanStepsEditor, PlanSteps } from "./PlanSteps";
import type { Candidate, EmployeeView, HrWorkspace, PlanView } from "./types";

export function PlansPanel({ data, onReload, onEdit, onCreate }: { data: HrWorkspace; onReload: () => Promise<void>; onEdit: (plan: PlanView) => void; onCreate: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [limit, setLimit] = useState(12);
  async function act(id: string, action: string, response?: string, stepId?: string) {
    setError(""); setBusy(id);
    try { await hrRequest("/plans", { id, action, response, stepId }); await onReload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Ошибка сохранения"); } finally { setBusy(""); }
  }
  const plans = data.plans.filter((p) => showArchive || p.state !== "archived");
  return <section className="space-y-5">
    <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{data.account.role === "employee" ? "Моё обучение" : "Планы обучения"}</h2><p className="mt-1 text-sm text-slate-500">Конкретные шаги, сроки и связь с карьерной целью.</p></div><div className="flex items-center gap-4">{data.account.role !== "employee" && <label className="flex items-center gap-2 text-sm text-slate-500"><input type="checkbox" checked={showArchive} onChange={(e) => setShowArchive(e.target.checked)} className="accent-emerald-700" />Показать архив</label>}{data.account.permissions.plans && <Button onClick={onCreate}><Plus />Создать план</Button>}</div></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!plans.length && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500"><BookOpen className="mx-auto mb-3 size-8 text-emerald-600" /><p>{data.account.permissions.plans ? "Выберите сотрудника и составьте первый план обучения." : "Опубликованные планы появятся здесь после согласования с HR."}</p></div>}
    <p className="text-sm text-slate-500">Планов в текущем срезе: {plans.length}</p>
    <div className="grid grid-cols-2 gap-5">{plans.slice(0, limit).map((plan) => <article key={plan.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><Badge variant="secondary">{plan.state === "draft" ? "Черновик" : plan.state === "archived" ? "Архив" : "Опубликован"}</Badge><span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="size-3" />{plan.totalHours} ч</span></div>
      <h3 className="mt-4 text-lg font-semibold">{plan.title}</h3><p className="mt-1 text-sm text-slate-500">{plan.employeeName} · {plan.department}</p><p className="mt-4 text-sm text-emerald-800">{plan.goal}</p>
      <PlanSteps plan={plan} data={data} busy={busy === plan.id} onComplete={(stepId) => void act(plan.id, "complete_task", undefined, stepId)} />
      {plan.note && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{plan.note}</p>}
      <div className="mt-auto border-t border-slate-100 pt-4"><div className="flex justify-between text-xs text-slate-500"><span>Пройдено {plan.completedEventIds.length} из {plan.steps.length}</span><span>{plan.response === "accepted" ? "Сотрудник принял план" : plan.response === "declined" ? "Сотрудник выбрал «Не сейчас»" : plan.state === "published" ? "Ожидает ответа сотрудника" : "Доступен только авторизованной команде"}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-600" style={{ width: `${plan.steps.length ? plan.completedEventIds.length / plan.steps.length * 100 : 0}%` }} /></div>
        <div className="mt-4 flex flex-wrap gap-2">{data.account.permissions.plans && plan.state !== "archived" && <><Button variant="outline" disabled={busy === plan.id} onClick={() => onEdit(plan)}><Pencil />Редактировать</Button>{plan.state === "draft" && <Button disabled={busy === plan.id} onClick={() => void act(plan.id, "publish")}><Send />Опубликовать</Button>}{plan.state === "published" && <Button variant="outline" disabled={busy === plan.id} onClick={() => void act(plan.id, "revise")}>Вернуть в черновик</Button>}<Button variant="ghost" disabled={busy === plan.id} onClick={() => void act(plan.id, "archive")}><Archive />В архив</Button></>}{data.account.role === "employee" && <><Button disabled={busy === plan.id || plan.response === "accepted"} onClick={() => void act(plan.id, "respond", "accepted")}><Check />Принять план</Button><Button variant="outline" disabled={busy === plan.id || plan.response === "declined"} onClick={() => void act(plan.id, "respond", "declined")}>Не сейчас</Button><Link href="/" className="ml-auto flex items-center gap-1 text-sm text-emerald-700">В город<ArrowUpRight className="size-4" /></Link></>}</div>
      </div>
    </article>)}</div>
    {plans.length > limit && <Button variant="outline" onClick={() => setLimit(limit + 12)}>Показать ещё 12 планов</Button>}
    <p className="text-xs text-slate-500">Учебные активности обновляются из истории, практические шаги отмечает сотрудник. Публикация и отметка практики не начисляют навыки.</p>
  </section>;
}

export function PlanEditor({ employee, plan, data, onSaved, onClose }: { employee: EmployeeView; plan?: PlanView; data: HrWorkspace; onSaved: () => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(plan?.title ?? `План развития · ${employee.name}`);
  const [goal, setGoal] = useState(plan?.goal ?? (employee.target ? `Подготовка к роли ${employee.target.role} · ${employee.target.grade}` : "Развитие профессиональных компетенций"));
  const [note, setNote] = useState(plan?.note ?? "");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [steps, setSteps] = useState(plan?.steps ?? []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const occupied = new Set(data.plans.filter((p) => p.employeeId === employee.id && p.id !== plan?.id && p.state !== "archived").flatMap((p) => p.steps.map((s) => s.eventId)));
  useEffect(() => { const abort = { current: false }; void hrRequest<{ candidates: Candidate[] }>(`/candidates?employeeId=${encodeURIComponent(employee.id)}`).then((r) => { if (!abort.current) setCandidates(r.candidates); }).catch((e: Error) => { if (!abort.current) setError(e.message); }).finally(() => { if (!abort.current) setLoading(false); }); return () => { abort.current = true; }; }, [employee.id]);
  const available = candidates.filter((c) => !occupied.has(c.eventId));
  const additions = available.filter((c) => !steps.some((s) => s.eventId === c.eventId)).slice(0, Math.min(3, 12 - steps.length));
  function deadline(c: Candidate) { const date = new Date(`${data.asOf}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 30); return [date.toISOString().slice(0, 10), c.nextSession?.slice(0, 10) ?? data.asOf].sort().at(-1)!; }
  const hours = steps.reduce((sum, s) => sum + (s.kind === "task" ? s.hours ?? 0 : data.events.find((event) => event.event_id === s.eventId)?.duration_hours ?? 0), 0);
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" role="dialog" aria-modal="true" aria-labelledby="plan-heading" onKeyDown={(e) => { if (e.key === "Escape" && !busy) onClose(); }}>
    <form className="flex h-full w-[760px] flex-col bg-white shadow-2xl" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError("");
      try { await hrRequest("/plans", { action: plan ? "update" : "create", id: plan?.id, expectedUpdatedAt: plan?.updatedAt, employeeId: employee.id, title, goal, note, steps }); await onSaved(); }
      catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить"); } finally { setBusy(false); }
    }}>
      <header className="flex items-start justify-between border-b p-6"><div><p className="text-xs font-medium uppercase tracking-widest text-emerald-700">Индивидуальное развитие</p><h2 id="plan-heading" className="mt-2 text-xl font-semibold">{plan ? "Изменить план обучения" : "Новый план обучения"}</h2><p className="mt-1 text-sm text-slate-500">{employee.name} · {employee.role} · {employee.grade}</p></div><Button type="button" variant="ghost" size="icon" disabled={busy} aria-label="Закрыть план" onClick={onClose}><X /></Button></header>
      <fieldset disabled={busy} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        <label className="block space-y-1 text-sm"><span>Название плана</span><input autoFocus required maxLength={200} className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block space-y-1 text-sm"><span>Ожидаемый результат</span><input required maxLength={600} className={fieldClass} value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-medium text-emerald-900">Разрывы до цели</p><div className="mt-2 flex flex-wrap gap-2">{employee.gaps.map((g) => <span key={g.skillId} className="rounded-lg bg-white px-2 py-1 text-xs text-emerald-900">{data.skills.find((s) => s.id === g.skillId)?.name ?? g.skillId} {g.current} → {g.required}{g.critical ? " · ключевой" : ""}</span>)}</div></div>
        <PlanStepsEditor steps={steps} onChange={setSteps} data={data} candidates={candidates} plan={plan} />
        <div className="flex items-center justify-between"><h3 className="font-semibold">Подходящие активности</h3><Button type="button" variant="outline" disabled={loading || !additions.length} onClick={() => setSteps([...steps, ...additions.map((c) => ({ eventId: c.eventId, dueDate: deadline(c) }))])}><Sparkles />Добавить до 3 шагов</Button></div>
        {loading && <p className="text-sm text-slate-500">Подбираем активности…</p>}
        {!loading && !available.length && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Сейчас нет новых подходящих активностей. Проверьте карьерную цель, требования и действующие планы.</p>}
        <div className="space-y-3">{available.map((c) => { const selected = steps.find((s) => s.eventId === c.eventId); return <div key={c.eventId} className={`rounded-xl border p-4 ${selected ? "border-emerald-400 bg-emerald-50/40" : "border-slate-200"}`}><label className="flex items-start gap-3"><input type="checkbox" checked={!!selected} disabled={plan?.completedEventIds.includes(c.eventId) || (!selected && steps.length >= 12)} className="mt-1 accent-emerald-700" onChange={(e) => setSteps(e.target.checked ? [...steps, { eventId: c.eventId, dueDate: deadline(c) }] : steps.filter((s) => s.eventId !== c.eventId))} /><div className="flex-1"><p className="text-sm font-semibold">{c.title}</p><p className="mt-1 text-xs text-slate-500">{c.hours} ч · {c.format === "online" ? "Онлайн" : c.format === "offline" ? "Очно" : "В своём темпе"}{c.nextSession ? ` · с ${dateLabel(c.nextSession)}` : ""}</p></div></label><ul className="ml-7 mt-3 space-y-1 text-xs leading-relaxed text-slate-600">{c.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>; })}</div>
        <label className="block space-y-1 text-sm"><span>Комментарий сотруднику</span><textarea value={note} maxLength={1500} onChange={(e) => setNote(e.target.value)} className={`${fieldClass} h-24 py-3`} placeholder="Что обсудить с наставником и как применить знания в работе" /></label>
      </fieldset>
      <footer className="space-y-3 border-t p-6">{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<div className="flex items-center justify-between"><span className="text-sm text-slate-500">{steps.length} активностей · {hours} ч</span><div className="flex gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Отмена</Button><Button type="submit" disabled={busy || loading || !steps.length}>{busy ? "Сохраняем…" : plan?.state === "published" ? "Сохранить изменения" : "Сохранить черновик"}</Button></div></div><p className="text-xs text-slate-500">{plan?.state === "published" ? "План останется опубликованным. После изменений сотрудник сможет заново принять его или выбрать «Не сейчас». Выполненные шаги сохранятся." : "После публикации сотрудник сможет принять план или выбрать «Не сейчас»."}</p></footer>
    </form>
  </div>;
}
