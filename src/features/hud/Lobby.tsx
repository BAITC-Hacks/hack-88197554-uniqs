"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Compass, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GRADE_CHARACTER, setAvatar, useAvatar } from "@/features/city/avatar";
import { useClientStore } from "@/lib/client-store";
import { NAV } from "@/nav";
import { CharacterSelect, HEROES } from "./CharacterSelect";
import { EmployeeSelect } from "./EmployeeSelect";
import { skillName } from "./data";

export function Lobby({ onStart, transitioning }: { onStart: (recommend: boolean) => void; transitioning: boolean }) {
  const profile = useClientStore((s) => s.profile);
  const employeeId = useClientStore((s) => s.employeeId);
  const ready = !!profile && profile.employee.employee_id === employeeId;
  const gap = profile?.gaps.find((g) => g.critical) ?? profile?.gaps[0];
  const grade = useClientStore((s) => s.profile?.employee.grade ?? s.employees.find((e) => e.employee_id === s.employeeId)?.grade);
  const hero = useAvatar() ?? GRADE_CHARACTER[grade ?? "Junior"];
  return (
    <section aria-label="Стартовое лобби" className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm">
      <Card className="w-[1200px] gap-0 overflow-visible bg-white py-0 shadow-2xl">
        <CardContent className="grid grid-cols-[1.45fr_1fr] p-0">
          <div className="flex min-h-[620px] flex-col rounded-l-xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white">
            <div className="px-8 pt-7">
              <div className="flex items-center gap-2 text-sm text-slate-300"><BriefcaseBusiness className="size-4" />Выбор героя</div>
              <h1 className="mt-2 text-2xl font-semibold">Город карьеры</h1>
              <p className="mt-1 text-sm text-slate-300">Класс подбирается по грейду, но выбор за вами: этот герой пойдёт по городу.</p>
            </div>
            <div className="relative min-h-[380px] flex-1">
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
          <div className="space-y-5 p-8">
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
              </> : <p className="mt-3 text-sm text-muted-foreground">Следующий грейд не задан. Откройте профиль и обсудите направление развития с наставником.</p>}
            </div>}
            <div className="space-y-2">
              <Button className="w-full" size="lg" disabled={!ready || transitioning} onClick={() => onStart(true)}><Compass />Подобрать следующий шаг<ArrowRight /></Button>
              <Button className="w-full" size="lg" variant="outline" disabled={!ready || transitioning} onClick={() => onStart(false)}>Исследовать город</Button>
            </div>
            <div className="border-t pt-4">
              <Link href="/hr" className="flex items-center justify-between rounded-lg p-2 text-sm font-medium hover:bg-muted"><span className="flex items-center gap-2"><UsersRound className="size-4" />Открыть HR-обзор</span><ArrowRight className="size-4" /></Link>
              <p className="px-2 text-xs text-muted-foreground">Компетенции команды, участие и следующие шаги</p>
              {NAV.filter((n) => !["/", "/hr"].includes(n.href)).map((n) => <Link key={n.href} href={n.href} className="mt-2 block px-2 text-sm underline">{n.label}</Link>)}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
