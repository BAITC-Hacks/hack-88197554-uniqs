"use client";

// Выбор этажа в лифте: DOM-оверлей поверх канваса. Этаж сотрудника помечен «Ваш этаж».

import { useClientStore } from "@/lib/client-store";
import { GRADES } from "@/lib/types";
import { getPlace, gradeFloor } from "@/lib/world";
import { cn } from "@/lib/utils";
import { sceneActions, useScene } from "../sceneState";

const FLOOR_NAMES = ["Junior · open-space", "Middle", "Senior", "Lead · пентхаус"];

export function ElevatorPanel() {
  const open = useScene((s) => s.elevator);
  const interior = useScene((s) => s.interior);
  const profile = useClientStore((s) => s.profile);
  if (!open || !interior) return null;
  const place = getPlace(interior.placeId);
  const mine = place?.department && profile?.employee.department === place.department ? gradeFloor(profile.employee.grade) : -1;

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/40" onClick={() => sceneActions.openElevator(false)}>
      <div className="w-80 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 text-sm font-semibold">Лифт · {place?.name}</div>
        <div className="flex flex-col-reverse gap-2">
          <FloorButton floor={-1} label="Лобби" active={interior.floor === -1} />
          {GRADES.map((g, i) => (
            <FloorButton key={g} floor={i} label={`${i + 1} · ${FLOOR_NAMES[i]}`} active={interior.floor === i} mine={mine === i} />
          ))}
        </div>
        <div className="mt-3 text-center text-xs text-muted-foreground">Esc — закрыть</div>
      </div>
    </div>
  );
}

function FloorButton({ floor, label, active, mine }: { floor: number; label: string; active: boolean; mine?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100",
        active && "border-slate-900 bg-slate-900 text-white hover:bg-slate-800",
      )}
      onClick={() => {
        sceneActions.openElevator(false);
        if (!active) sceneActions.goFloor(floor);
      }}
    >
      <span>{label}</span>
      {mine && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", active ? "bg-amber-300 text-slate-900" : "bg-amber-100 text-amber-900")}>Ваш этаж</span>}
    </button>
  );
}
