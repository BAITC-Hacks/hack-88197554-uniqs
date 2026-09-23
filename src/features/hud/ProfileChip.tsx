"use client";

import { Progress } from "@/components/ui/progress";
import { actions, useClientStore } from "@/lib/client-store";

export function ProfileChip() {
  const profile = useClientStore((s) => s.profile);
  if (!profile) return null;
  const { employee, target, gradeProgress } = profile;
  const pct = gradeProgress.total ? (gradeProgress.met / gradeProgress.total) * 100 : 100;

  return (
    <button type="button" aria-label={`Открыть профиль: ${employee.full_name}`} onClick={() => actions.openPanel("character")} className="pointer-events-auto w-72 rounded-xl bg-white/95 px-4 py-3 text-left text-xs shadow-sm ring-1 ring-foreground/10 hover:bg-white">
      <div className="text-sm font-medium">{employee.full_name}</div>
      <div className="text-muted-foreground">
        {employee.role} · {employee.grade}
        {target && ` → ${target.role === employee.role ? "" : `${target.role} `}${target.grade}`}
      </div>
      {target && (
        <div className="mt-2 space-y-1.5">
          <Progress value={pct} aria-label={`Требования к ${target.grade}`} />
          <div className="tabular-nums text-muted-foreground">Закрыто {gradeProgress.met} из {gradeProgress.total} требований к {target.grade}</div>
        </div>
      )}
    </button>
  );
}
