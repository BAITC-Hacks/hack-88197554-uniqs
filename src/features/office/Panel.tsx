"use client";

import { Progress } from "@/components/ui/progress";
import { useClientStore } from "@/lib/client-store";
import { GRADES, type PanelProps } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEPARTMENT_COLOR, getPlace, gradeFloor } from "@/lib/world";

export default function OfficePanel({ placeId }: PanelProps) {
  const profile = useClientStore((s) => s.profile);
  const employees = useClientStore((s) => s.employees);
  const department = placeId ? getPlace(placeId)?.department : undefined;
  if (!department) return <p className="text-muted-foreground">Башня не найдена</p>;

  const color = DEPARTMENT_COLOR[department];
  // только число: чужие имена и грейды не показываем
  const headcount = employees.filter((e) => e.department === department).length;
  const own = profile?.employee.department === department ? profile : null;
  const myFloor = own ? gradeFloor(own.employee.grade) : -1;
  const gp = own?.gradeProgress;
  const nextFloorInRole = own?.target?.role === own?.employee.role;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="size-4 rounded" style={{ background: color }} />
        <h2 className="text-lg font-semibold">{department}</h2>
      </div>
      <p className="text-muted-foreground">Сотрудников в отделе: {headcount}</p>

      <div className="space-y-1.5">
        {[...GRADES].reverse().map((grade) => {
          const floor = gradeFloor(grade);
          const mine = floor === myFloor;
          const next = own && nextFloorInRole && floor === myFloor + 1;
          return (
            <div
              key={grade}
              className={cn("rounded-lg border px-3 py-2", mine && "border-2 font-medium")}
              style={mine ? { borderColor: color, background: `${color}1a` } : undefined}
            >
              <div className="flex items-center justify-between">
                <span>
                  {floor + 1} этаж · {grade}
                </span>
                {mine && <span className="text-xs">вы здесь</span>}
              </div>
              {next && gp && (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Progress value={gp.total ? (gp.met / gp.total) * 100 : 100} className="flex-1" />
                  {gp.met}/{gp.total}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {own?.target && !nextFloorInRole && gp && (
        <p className="text-xs text-muted-foreground">
          Цель в другой роли: {own.target.role} {own.target.grade} — закрыто {gp.met} из {gp.total}
        </p>
      )}
      {!own && <p className="text-xs text-muted-foreground">Этаж вашего грейда в этой компании</p>}
    </div>
  );
}
