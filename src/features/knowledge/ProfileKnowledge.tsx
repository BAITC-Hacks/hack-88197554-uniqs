"use client";

import { useEffect, useState } from "react";
import { BookOpen, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askMentor } from "@/features/mentor/questions";
import { actions } from "@/lib/client-store";
import type { Profile } from "@/lib/types";
import type { KnowledgeContext } from "./context";
import { KnowledgeGuide } from "./Guide";

export function ProfileKnowledge({ profile }: { profile: Profile }) {
  const [result, setResult] = useState<{ profile: Profile; knowledge: KnowledgeContext } | null>(null);
  const [error, setError] = useState<{ profile: Profile; text: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/knowledge?employeeId=${encodeURIComponent(profile.employee.employee_id)}`, {
      cache: "no-store", signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Не удалось получить подсказки по профилю.");
      return response.json() as Promise<KnowledgeContext>;
    }).then(knowledge => {
      if (!controller.signal.aborted) setResult({ profile, knowledge });
    }).catch(() => {
      if (!controller.signal.aborted) setError({ profile, text: "Подсказки по профилю сейчас недоступны. Можно задать вопрос наставнику." });
    });
    return () => controller.abort();
  }, [profile]);
  const knowledge = result?.profile === profile ? result.knowledge : null;
  const uncovered = knowledge?.coverage.filter(gap => gap.status === "uncovered") ?? [];
  const shown = uncovered.length ? uncovered : knowledge?.coverage.slice(0, 2) ?? [];

  return (
    <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
      <h3 className="flex items-center gap-2 font-semibold"><BookOpen className="size-4 text-emerald-700" />Твой маршрут в экосистеме</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {knowledge?.summary ?? "Сопоставляем твою цель, навыки и условия каталога. Наставнику можно задать вопрос об обучении, карьерном переходе или рабочей практике."}
      </p>
      {error?.profile === profile && <p role="alert" className="text-xs text-amber-800">{error.text}</p>}
      {shown.length > 0 && <details open className="space-y-2">
        <summary className="cursor-pointer text-xs font-medium">{uncovered.length ? `Требуют отдельного плана · ${uncovered.length}` : "Навыки, с которых стоит начать"}</summary>
        {shown.map(gap => (
          <div key={gap.skillId} className="space-y-2 rounded-lg border bg-white p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{gap.name}{gap.critical && " · ключевой"}</span>
              <span className="shrink-0 tabular-nums">{gap.current} → {gap.required}</span>
            </div>
            {gap.status === "uncovered" ? <>
              <p className="text-amber-800">Нет доступного обучения: {gap.reasons.join("; ").toLowerCase()}.</p>
              <p className="leading-relaxed text-muted-foreground">{gap.advice}</p>
              <p className="text-[10px] text-muted-foreground">Идея для согласования с руководителем · без автоматического начисления прогресса</p>
            </> : <p className="text-muted-foreground">Доступно активностей: {gap.available.length}. Ближайший выбор: {gap.available[0].title}.</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="xs" variant="outline" onClick={() => askMentor(`Разбери мой разрыв по навыку ${gap.name}: ${gap.current} → ${gap.required}. Что доступно в каталоге и какой рабочий проект можно обсудить с руководителем?`)}><MessageCircle />Разобрать с наставником</Button>
              {gap.available[0] && <Button size="xs" variant="ghost" onClick={() => actions.travelTo(gap.available[0].placeId)}>К площадке</Button>}
            </div>
          </div>
        ))}
      </details>}
      <Button size="sm" variant="outline" onClick={() => askMentor("Разбери мой профиль: какие разрывы приоритетны, что покрывает каталог и что обсудить с руководителем?")}><MessageCircle />Обсудить мой профиль</Button>
      {knowledge && <p className="text-[10px] leading-relaxed text-muted-foreground">На {knowledge.asOf} · Источники: {knowledge.sources.join(" · ")}</p>}
      <KnowledgeGuide />
    </section>
  );
}
