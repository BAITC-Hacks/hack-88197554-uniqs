"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { skillName, useEvents } from "@/features/hud/data";
import { useClientStore } from "@/lib/client-store";
import type { HistoryStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const FORMAT: Record<string, string> = { office: "офис", hybrid: "гибрид", remote: "удалённо" };

const STATUS: Record<HistoryStatus, { label: string; className: string }> = {
  completed: { label: "пройдено", className: "bg-emerald-100 text-emerald-800" },
  in_progress: { label: "в процессе", className: "bg-sky-100 text-sky-800" },
  overdue: { label: "просрочено", className: "bg-amber-100 text-amber-800" },
  dropped: { label: "брошено", className: "bg-rose-100 text-rose-800" },
  no_show: { label: "не пришёл", className: "bg-rose-100 text-rose-800" },
  declined: { label: "отказ", className: "bg-rose-100 text-rose-800" },
};

export default function CharacterPanel() {
  const profile = useClientStore((s) => s.profile);
  const events = useEvents();
  if (!profile) return <p className="text-muted-foreground">Загрузка профиля…</p>;

  const { employee, target, gradeProgress: gp, gaps, effectiveSkills, reviewBumps } = profile;
  const bumped = new Set(reviewBumps.map((b) => b.skillId));
  const skills = [...gaps].sort(
    (a, b) => Number(b.critical) - Number(a.critical) || b.required - b.current - (a.required - a.current),
  );
  const history = [...profile.history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const titleOf = (id: string) => events.find((e) => e.event_id === id)?.title ?? id;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <h2 className="text-lg font-semibold">{employee.full_name}</h2>
        <p className="text-muted-foreground">
          {employee.role} · {employee.grade} · {employee.department}
        </p>
        <p className="text-muted-foreground">
          Стаж {employee.tenure_months} мес. · {FORMAT[employee.work_format]}
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="font-medium">
          Цель:{" "}
          {target ? `${target.role} ${target.grade}` : "вершина лестницы"}
          {target?.source === "next_grade" && (
            <span className="font-normal text-muted-foreground"> (цель не задана — следующий грейд)</span>
          )}
        </div>
        {target && (
          <>
            <Progress value={gp.total ? (gp.met / gp.total) * 100 : 100} />
            <p className="text-xs text-muted-foreground">
              Закрыто {gp.met} из {gp.total}, ключевых {gp.criticalMet} из {gp.criticalTotal}
            </p>
          </>
        )}
      </div>

      {skills.length > 0 && (
        <div className="space-y-1">
          <div className="font-medium">Навыки цели</div>
          {skills.map((g) => {
            const current = effectiveSkills[g.skillId] ?? g.current;
            return (
              <div key={g.skillId} className="flex items-center gap-2">
                <span className="flex-1">{skillName(g.skillId)}</span>
                {bumped.has(g.skillId) && <span className="text-xs text-emerald-700">+1 после ревью</span>}
                {g.critical && <Badge variant="destructive">ключевой</Badge>}
                <span className={cn("w-10 text-right tabular-nums", current >= g.required && "text-emerald-700")}>
                  {current} / {g.required}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {reviewBumps.some((b) => !gaps.some((g) => g.skillId === b.skillId)) && (
        <p className="text-xs text-muted-foreground">
          После ревью выросли:{" "}
          {reviewBumps
            .filter((b) => !gaps.some((g) => g.skillId === b.skillId))
            .map((b) => `${skillName(b.skillId)} ${b.from} → ${b.to}`)
            .join(", ")}
        </p>
      )}

      <Separator />

      <div className="space-y-1">
        <div className="font-medium">История</div>
        {history.length === 0 && <p className="text-muted-foreground">Пока пусто</p>}
        {history.map((h) => (
          <div key={h.record_id} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">{h.date}</span>
            <span className="flex-1 truncate" title={h.event_id}>
              {titleOf(h.event_id)}
            </span>
            <Badge className={STATUS[h.status].className}>{STATUS[h.status].label}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
