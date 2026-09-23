"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, GitCompareArrows, Target } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getScene, sceneActions } from "@/features/city/sceneState";
import { actions, getState, useClientStore } from "@/lib/client-store";
import { venueOf } from "@/lib/world";
import type { Profile } from "@/lib/types";
import { pathId, type CareerPath, type CareerPreview, type SkillFit } from "./domain";

const FORMAT = { online: "онлайн", offline: "очно", self_paced: "в своём темпе" };

function SkillRow({ skill }: { skill: SkillFit }) {
  return <li className="flex items-center justify-between gap-3 py-1.5">
    <span className="min-w-0"><span className="block text-sm">{skill.name}</span>{skill.critical && <span className="text-[11px] font-medium text-amber-700">Ключевой для этой роли</span>}</span>
    <span className={`flex shrink-0 items-center gap-1.5 text-sm tabular-nums ${skill.met ? "text-emerald-700" : "text-slate-600"}`}>
      {skill.met && <Check className="size-3.5" />}{skill.current} / {skill.required}
    </span>
  </li>;
}

function PathCard({ path, paths, otherId, label, currentId, busy, onSelect, onApply }: {
  path: CareerPath; paths: CareerPath[]; otherId?: string; label: string; currentId?: string; busy: boolean;
  onSelect: (id: string) => void; onApply: () => void;
}) {
  const met = path.skills.filter(s => s.met);
  const missing = path.skills.filter(s => !s.met);
  const gp = path.progress;
  const active = path.id === currentId;
  return <section aria-label={label} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white">
    <div className="space-y-3 border-b border-slate-100 p-5">
      <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>{active && <Badge variant="secondary">Текущая цель</Badge>}</div>
      <Select value={path.id} onValueChange={value => { if (typeof value === "string") onSelect(value); }}>
        <SelectTrigger aria-label={`Целевая роль · ${label}`} className="h-10 w-full bg-white" disabled={busy}><SelectValue>{path.target.role} · {path.target.grade}</SelectValue></SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {paths.map(option => <SelectItem key={option.id} value={option.id} disabled={option.id === otherId}>{option.target.role} · {option.target.grade}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex items-baseline justify-between"><span className="text-sm text-slate-600">Требования выполнены</span><span className="text-xl font-semibold tabular-nums">{gp.met}<span className="text-sm font-normal text-slate-400"> / {gp.total}</span></span></div>
      <Progress value={gp.total ? gp.met / gp.total * 100 : 0} />
      <p className="text-xs text-slate-500">Ключевые навыки: {gp.criticalMet} из {gp.criticalTotal}</p>
    </div>
    <div className="flex-1 space-y-5 p-5">
      <div><h3 className="text-sm font-semibold">Что развить <span className="font-normal text-slate-400">· {missing.length}</span></h3>
        {missing.length ? <ul className="mt-1 divide-y divide-slate-100">{missing.map(skill => <SkillRow key={skill.skillId} skill={skill} />)}</ul>
          : <p className="mt-2 text-sm text-emerald-700">Требования по навыкам закрыты. Можно обсудить следующий шаг с руководителем.</p>}
      </div>
      <details className="rounded-lg bg-emerald-50/60 px-3 py-2" open={met.length > 0 && met.length <= 3}>
        <summary className="cursor-pointer text-sm font-medium text-emerald-800">Уже подходит · {met.length}</summary>
        {met.length ? <ul className="mt-1">{met.map(skill => <SkillRow key={skill.skillId} skill={skill} />)}</ul> : <p className="mt-2 text-xs text-slate-600">Пока ни один навык не достиг уровня, указанного для этой роли.</p>}
      </details>
      <div className="space-y-2"><h3 className="text-sm font-semibold">Какие активности помогут</h3>
        <p className="text-xs leading-relaxed text-slate-500">Доступны с вашей текущей ролью и грейдом. Эффект каждой активности рассчитан отдельно.</p>
        {path.steps.map(step => <article key={step.eventId} className="space-y-1.5 rounded-lg border border-slate-200 p-3">
          <h4 className="text-sm font-medium">{step.title}</h4>
          <p className="text-xs leading-relaxed text-emerald-700">{step.factors[0].text}</p>
          <p className="text-xs text-slate-500">{venueOf(step.eventType).name} · {step.hours} ч · {FORMAT[step.format]}</p>
          <p className="text-xs text-slate-500">{step.nextSession ? `Ближайшая сессия: ${step.nextSession}` : "Начало в удобное время"}</p>
          {step.factors.filter(f => f.kind === "history" || f.kind === "format").map(f => <p key={f.kind} className="text-xs text-amber-800">{f.text}</p>)}
        </article>)}
        {!path.steps.length && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{missing.length ? "В каталоге пока нет доступных активностей для этой траектории. Обсудите обучение или ротацию с наставником." : "Дополнительное обучение для требований этой роли сейчас не нужно."}</p>}
        {path.uncoveredSkillIds.length > 0 && <p className="text-xs leading-relaxed text-amber-800">Нужен отдельный план для: {path.skills.filter(s => path.uncoveredSkillIds.includes(s.skillId)).map(s => s.name).join(", ")}. В доступном каталоге нет подходящих шагов для этих навыков.</p>}
      </div>
    </div>
    <div className="border-t border-slate-100 p-5"><Button className="w-full" variant={active ? "secondary" : "default"} disabled={busy || active} onClick={onApply}><Target />{active ? "Это моя текущая цель" : busy ? "Сохраняем…" : "Выбрать эту цель"}</Button></div>
  </section>;
}

function ExplorerBody({ profile, onApplied }: { profile: Profile; onApplied: () => void }) {
  const [loaded, setLoaded] = useState<{ source: Profile; data: CareerPreview } | null>(null);
  const [selection, setSelection] = useState<[string, string]>(["", ""]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const employeeId = profile.employee.employee_id;

  useEffect(() => {
    const wasLocked = getScene().controlsLocked;
    sceneActions.lockControls(true);
    actions.clearMoveTarget();
    return () => sceneActions.lockControls(wasLocked);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/career/preview?employeeId=${encodeURIComponent(employeeId)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Не удалось рассчитать траектории. Закройте окно и попробуйте снова.");
        return await response.json() as CareerPreview;
      })
      .then(data => { if (!controller.signal.aborted) { setLoaded({ source: profile, data }); setError(""); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Ошибка расчёта"); });
    return () => controller.abort();
  }, [profile, employeeId]);

  const data = loaded?.source === profile && loaded.data.employeeId === employeeId ? loaded.data : null;
  const currentId = profile.target ? pathId(profile.target.role, profile.target.grade) : undefined;
  const paths = data?.paths ?? [];
  const first = paths.find(p => p.id === selection[0]) ?? paths.find(p => p.id === currentId) ?? paths[0];
  const second = paths.find(p => p.id === selection[1] && p.id !== first?.id)
    ?? paths.find(p => p.id !== first?.id && p.target.role !== first?.target.role && p.target.grade === first?.target.grade)
    ?? paths.find(p => p.id !== first?.id);

  async function apply(path: CareerPath) {
    if (busy || getState().employeeId !== employeeId) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/goal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, target_role: path.target.role, target_grade: path.target.grade }) });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Не удалось сохранить цель");
      if (getState().employeeId !== employeeId) return;
      actions.setRecommendations([]);
      await actions.refreshProfile();
      if (getState().employeeId !== employeeId) return;
      actions.setRecommendations(path.steps);
      toast.success(`Цель: ${path.target.role} · ${path.target.grade}`);
      onApplied();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не удалось сохранить цель"); }
    finally { setBusy(false); }
  }

  return <>
    <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-sm"><span className="font-medium">Сейчас: {profile.employee.role} · {profile.employee.grade}</span><ArrowRight className="size-4 text-slate-400" /><span className="text-slate-600">Выберите два варианта развития</span></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!data && !error && <p className="py-8 text-center text-sm text-slate-500">Сопоставляем навыки с требованиями ролей…</p>}
    {data && !paths.length && <p className="py-8 text-sm text-slate-500">В каталоге нет других целевых ролей для этого грейда.</p>}
    {first && <div className="grid grid-cols-2 items-stretch gap-4">
      <PathCard path={first} paths={paths} otherId={second?.id} label="Траектория A" currentId={currentId} busy={busy} onSelect={id => setSelection([id, second?.id ?? ""])} onApply={() => void apply(first)} />
      {second && <PathCard path={second} paths={paths} otherId={first.id} label="Траектория B" currentId={currentId} busy={busy} onSelect={id => setSelection([first.id, id])} onApply={() => void apply(second)} />}
    </div>}
  </>;
}

export function CareerExplorer() {
  const profile = useClientStore(s => s.profile);
  const employeeId = useClientStore(s => s.employeeId);
  const [open, setOpen] = useState(false);
  const ready = profile?.employee.employee_id === employeeId;
  return <>
    <Button variant="outline" size="sm" disabled={!ready} onClick={() => setOpen(true)}><GitCompareArrows />Примерить роль</Button>
    <Dialog open={open && ready} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-slate-50 p-6 sm:max-w-[1040px]">
        <DialogHeader><DialogTitle className="text-xl">Примерить будущую роль</DialogTitle><DialogDescription>{profile?.employee.full_name} · Сравните навыки и доступные шаги. Цель изменится после нажатия «Выбрать эту цель».</DialogDescription></DialogHeader>
        {open && ready && profile && <ExplorerBody key={employeeId} profile={profile} onApplied={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  </>;
}
