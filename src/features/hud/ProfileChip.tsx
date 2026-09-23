"use client";

import { Progress } from "@/components/ui/progress";
import { useClientStore } from "@/lib/client-store";

export function ProfileChip() {
  const profile = useClientStore((s) => s.profile);
  if (!profile) return null;
  const { employee, target, gradeProgress } = profile;
  const pct = gradeProgress.total ? (gradeProgress.met / gradeProgress.total) * 100 : 100;

  return (
    <div className="pointer-events-auto w-72 rounded-xl bg-white/85 px-3 py-2 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur">
      <div className="text-sm font-medium">{employee.full_name}</div>
      <div className="text-muted-foreground">
        {employee.role} · {employee.grade}
        {target && ` → ${target.role === employee.role ? "" : `${target.role} `}${target.grade}`}
      </div>
      {target && (
        <div className="mt-1.5 flex items-center gap-2">
          <Progress value={pct} className="flex-1" />
          <span className="tabular-nums text-muted-foreground">
            {gradeProgress.met}/{gradeProgress.total}
          </span>
        </div>
      )}
    </div>
  );
}
