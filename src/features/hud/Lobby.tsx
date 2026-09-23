"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Compass, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useClientStore } from "@/lib/client-store";
import { NAV } from "@/nav";
import { EmployeeSelect } from "./EmployeeSelect";
import { skillName } from "./data";

export function Lobby({ onStart, transitioning }: { onStart: (recommend: boolean) => void; transitioning: boolean }) {
  const profile = useClientStore((s) => s.profile);
  const employeeId = useClientStore((s) => s.employeeId);
  const ready = !!profile && profile.employee.employee_id === employeeId;
  const gap = profile?.gaps.find((g) => g.critical) ?? profile?.gaps[0];
  return (
    <section aria-label="Стартовое лобби" className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm">
      <Card className="w-[920px] gap-0 overflow-visible bg-white py-0 shadow-2xl">
        <CardContent className="grid grid-cols-[0.9fr_1.1fr] p-0">
          <div className="flex flex-col justify-between rounded-l-xl bg-slate-900 p-9 text-white">
            <div><div className="flex items-center gap-2 text-sm text-slate-300"><BriefcaseBusiness className="size-4" />Город карьеры</div><h1 className="mt-8 text-3xl font-semibold leading-tight">Ваш следующий<br />шаг начинается здесь</h1><p className="mt-4 text-sm leading-relaxed text-slate-300">Найдите подходящую активность для своей цели и наблюдайте, как растёт ваш профессиональный опыт.</p></div>
            <ol className="mt-10 space-y-4 text-sm text-slate-200"><li>01 · Посмотрите свою траекторию</li><li>02 · Получите совет наставника</li><li>03 · Сделайте шаг к цели</li></ol>
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
