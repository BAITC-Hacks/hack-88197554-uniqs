"use client";

import { BookOpen, ChevronDown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEPARTMENT_COMPANY } from "@/features/city/companies";
import { askMentor } from "@/features/mentor/questions";
import { getPlace } from "@/lib/world";
import { ARTICLES } from "./catalog";

export function KnowledgeGuide() {
  return (
    <details className="group rounded-xl border bg-white text-xs">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 font-medium">
        <BookOpen className="size-4 text-emerald-700" />База знаний экосистемы
        <ChevronDown className="ml-auto size-3.5 group-open:rotate-180" />
      </summary>
      <div className="max-h-72 space-y-2 overflow-y-auto border-t p-3">
        {ARTICLES.map(article => (
          <details key={article.id} className="rounded-lg bg-muted/40 p-2.5">
            <summary className="cursor-pointer font-medium">{article.title}</summary>
            <p className="mt-2 leading-relaxed text-muted-foreground">{article.text}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">Источник: {article.source}</p>
          </details>
        ))}
      </div>
    </details>
  );
}

export function PlaceKnowledge({ placeId }: { placeId?: string }) {
  const place = placeId ? getPlace(placeId) : undefined;
  if (!place) return null;
  const company = place.department && DEPARTMENT_COMPANY[place.department];
  const article = ARTICLES.find(item => item.id === (company ? "companies" : "venues"))!;
  const question = company
    ? `Расскажи про ${company} и отдел ${place.department} в нашем городе. Как это связано с моей целью?`
    : `Что можно делать в месте «${place.name}» и как выбрать здесь полезный шаг для моего профиля?`;
  return (
    <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium"><BookOpen className="size-3.5 text-emerald-700" />Об этом месте</p>
      <p className="leading-relaxed text-muted-foreground">
        {company ? `${company} обозначает отдел ${place.department} в демо. Этажи отражают карьерные грейды; реальные вакансии и проекты компании не подключены.` : article.text}
      </p>
      <Button size="xs" variant="outline" onClick={() => askMentor(question)}><MessageCircle />Обсудить с наставником</Button>
    </div>
  );
}
