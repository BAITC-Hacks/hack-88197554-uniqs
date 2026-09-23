"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Compass, Upload, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GRADE_CHARACTER, setAvatar, useAvatar } from "@/features/city/avatar";
import { useClientStore } from "@/lib/client-store";
import { CharacterSelect, HEROES } from "./CharacterSelect";
import { EmployeeSelect } from "./EmployeeSelect";
import { GoalStep } from "./GoalStep";
import { skillName } from "./data";

export function Lobby({ onStart, transitioning }: { onStart: (recommend: boolean) => void; transitioning: boolean }) {
  const profile = useClientStore((s) => s.profile);
  const employeeId = useClientStore((s) => s.employeeId);
  const ready = !!profile && profile.employee.employee_id === employeeId;
  const gap = profile?.gaps.find((g) => g.critical) ?? profile?.gaps[0];
  const grade = useClientStore((s) => s.profile?.employee.grade ?? s.employees.find((e) => e.employee_id === s.employeeId)?.grade);
  const hero = useAvatar() ?? GRADE_CHARACTER[grade ?? "Junior"];
  const [step, setStep] = useState<1 | 2>(1);
  return (
    <section aria-label="Стартовое лобби" className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm">
      <Card className="w-[1200px] gap-0 overflow-visible bg-white py-0 shadow-2xl">
        <CardContent className="grid h-[700px] grid-cols-[1.3fr_1fr] p-0">
          <div className="flex min-h-0 flex-col rounded-l-xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white">
            <div className="px-8 pt-7">
              <div className="flex items-center gap-2 text-sm text-slate-300"><BriefcaseBusiness className="size-4" />Выбор героя</div>
              <h1 className="mt-2 text-2xl font-semibold">Город карьеры</h1>
              <p className="mt-1 text-sm text-slate-300">Класс подбирается по грейду, но выбор за вами: этот герой пойдёт по городу.</p>
            </div>
            <div className="relative min-h-0 flex-1">
              <CharacterSelect selected={hero} onSelect={setAvatar} />
            </div>
            <div className="grid grid-cols-4 gap-2 px-8 pb-7">
              {HEROES.map((h) => {
                const active = h.id === hero;
                return <button key={h.id} type="button" aria-pressed={active} onClick={() => setAvatar(h.id)} className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${active ? "border-emerald-400 bg-emerald-400/15" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <span className="block text-sm font-medium">{h.name}</span>
                  <span className="block text-xs text-slate-400">для {h.grade}{h.grade === grade ? " · ваш грейд" : ""}</span>
                </button>;
              })}
            </div>
          </div>
          <div className="flex min-h-0 flex-col">
            <nav aria-label="Шаги лобби" className="flex gap-2 px-8 pt-7">
              {([[1, "Персонаж"], [2, "Кем хочу стать"]] as const).map(([n, label]) => (
                <button key={n} type="button" disabled={n === 2 && !ready} aria-current={step === n ? "step" : undefined} onClick={() => setStep(n)} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${step === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  <span className="tabular-nums">{n}</span>{label}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto px-8 py-5">
              {step === 1 ? <div className="space-y-5">
                <div><h2 className="text-lg font-semibold">Войти как сотрудник</h2><p className="mt-1 text-sm text-muted-foreground">Выберите свой профиль для этого демо.</p></div>
                <EmployeeSelect expanded />
                {ready && <div className="rounded-lg bg-muted/60 p-4">
                  <p className="font-medium">{profile.employee.full_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{profile.employee.role} · {profile.employee.grade}</p>
                  {profile.target ? <>
                    <p className="mt-4 text-sm font-medium">Цель: {profile.target.role} · {profile.target.grade}</p>
                    <Progress className="mt-2" value={profile.gradeProgress.total ? profile.gradeProgress.met / profile.gradeProgress.total * 100 : 0} />
                    <p className="mt-2 text-xs text-muted-foreground">Закрыто {profile.gradeProgress.met} из {profile.gradeProgress.total} требований</p>
                    {gap && <p className="mt-3 text-sm">Нужно развить: {skillName(gap.skillId)} — {gap.current} из {gap.required}{gap.critical ? ", ключевой навык" : ""}.</p>}
                  </> : <p className="mt-3 text-sm text-muted-foreground">Следующий грейд не задан. Выберите цель на следующем шаге.</p>}
                </div>}
              </div> : <GoalStep />}
            </div>
            <nav aria-label="Инструменты команды" className="grid shrink-0 grid-cols-2 gap-3 px-8 pb-4">
              <Link href="/upload" className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center gap-2 text-sm font-medium"><Upload aria-hidden="true" className="size-4 shrink-0" />Импорт данных<ArrowRight aria-hidden="true" className="ml-auto size-4 shrink-0" /></span>
                <span className="mt-1.5 block text-xs text-muted-foreground">Профили и история активностей</span>
              </Link>
              <Link href="/hr" className="rounded-lg border bg-background p-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center gap-2 text-sm font-medium"><UsersRound aria-hidden="true" className="size-4 shrink-0" />HR-панель<ArrowRight aria-hidden="true" className="ml-auto size-4 shrink-0" /></span>
                <span className="mt-1.5 block text-xs text-muted-foreground">Команда и планы развития</span>
              </Link>
            </nav>
            <div className="space-y-2 border-t px-8 pb-7 pt-4">
              {step === 1
                ? <Button className="w-full" size="lg" disabled={!ready} onClick={() => setStep(2)}>Дальше: цель<ArrowRight /></Button>
                : <div className="flex gap-2">
                  <Button size="lg" variant="ghost" aria-label="Назад к персонажу" onClick={() => setStep(1)}><ArrowLeft /></Button>
                  <Button className="flex-1" size="lg" disabled={!ready || transitioning} onClick={() => onStart(true)}><Compass />Начать путь<ArrowRight /></Button>
                </div>}
              <Button className="w-full" size="lg" variant="outline" disabled={!ready || transitioning} onClick={() => onStart(false)}>Исследовать город</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
