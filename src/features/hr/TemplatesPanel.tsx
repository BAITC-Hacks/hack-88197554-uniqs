"use client";

import { useEffect, useState } from "react";
import { BookOpen, Layers3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fieldClass, hrRequest } from "./client";
import type { LearningTemplate } from "./templates";

type TemplateView = LearningTemplate & { matchingEmployees: number };
export function TemplatesPanel({ onReload }: { onReload: () => Promise<void> }) {
  const [templates, setTemplates] = useState<TemplateView[]>([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void hrRequest<{ templates: TemplateView[] }>("/templates").then((r) => setTemplates(r.templates)).catch((e: Error) => setError(e.message)); }, []);
  async function fill(templateId?: string) {
    setBusy(true); setError(""); setStatus("");
    try {
      const result = await hrRequest<{ created: number; skipped: number }>("/seed", { templateId });
      setStatus(`Создано планов: ${result.created}. Сохранены существующие: ${result.skipped}. Новые планы опубликованы и ожидают согласия сотрудников.`);
      await onReload();
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сформировать планы"); } finally { setBusy(false); }
  }
  return <section className="space-y-5">
    <div className="flex items-center justify-between rounded-2xl bg-emerald-950 p-6 text-white"><div><p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-200"><Layers3 className="size-4" />Библиотека развития</p><h2 className="text-xl font-semibold">Шаблон задаёт путь. План учитывает человека.</h2><p className="mt-2 max-w-2xl text-sm text-emerald-100/75">Роль, грейд, текущие навыки, история и доступность обучения определяют шаги. Существующие планы сохраняются.</p></div><Button className="h-10 shrink-0 bg-white text-emerald-950 hover:bg-emerald-50" disabled={busy || !templates.length} onClick={() => void fill()}><Plus />Планы для всех доступных сотрудников</Button></div>
    {status && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{status}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{templates.length} шаблона · только сотрудники в вашей области доступа</p><select aria-label="Роль в шаблонах" className={`${fieldClass} !w-64`} value={role} onChange={(e) => setRole(e.target.value)}><option value="">Все роли</option>{[...new Set(templates.flatMap((t) => t.role ? [t.role] : []))].map((r) => <option key={r}>{r}</option>)}</select></div>
    <div className="grid grid-cols-3 gap-5">{templates.filter((t) => !role || t.role === role).map((template) => <article key={template.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><BookOpen className="size-5 text-emerald-700" /><span className="text-xs text-slate-400">{template.durationDays} дней · ориентир</span></div><h3 className="mt-4 font-semibold">{template.title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{template.description}</p><div className="my-4 flex flex-wrap gap-1.5">{template.focus.map((s) => <span key={s.id} className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800">{s.name} · {s.level}</span>)}</div><ol className="mb-5 space-y-2 text-xs text-slate-500">{template.milestones.map((m, i) => <li key={m}>{i + 1}. {m}</li>)}</ol><div className="mt-auto border-t border-slate-100 pt-4"><p className="mb-3 text-xs text-slate-400">Цель соответствует {template.matchingEmployees} сотрудникам</p><Button variant="outline" className="w-full" disabled={busy || !template.matchingEmployees} onClick={() => void fill(template.id)}>Применить по карьерным целям</Button></div></article>)}</div>
  </section>;
}
