"use client";

import { useXp } from "./useXp";
import { formatXp, XP_RULE, type XpInfo } from "./xp";

function pct(xp: XpInfo): number {
  return Math.min(100, (xp.levelXp / xp.nextLevelXp) * 100);
}

export function XpBar({ xp, className = "h-1" }: { xp: XpInfo; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-full bg-amber-100 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-700"
        style={{ width: `${pct(xp)}%` }}
      />
    </div>
  );
}

export function LevelBadge({ level, className = "" }: { level: number; className?: string }) {
  return (
    <span className={`rounded-md bg-gradient-to-b from-amber-300 to-amber-500 px-1.5 py-0.5 text-[11px] font-bold text-amber-950 shadow-sm ${className}`}>
      Ур. {level}
    </span>
  );
}

/** HUD-чип: уровень и тонкая полоска опыта, отдельно от требований к грейду */
export function XpChipBar() {
  const xp = useXp();
  if (!xp) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <LevelBadge level={xp.level} />
        <span className="font-medium text-amber-900">{xp.title}</span>
        <span className="ml-auto tabular-nums text-muted-foreground">
          {formatXp(xp.levelXp)} / {formatXp(xp.nextLevelXp)} XP
        </span>
      </div>
      <XpBar xp={xp} />
    </div>
  );
}

/** блок уровня в листе персонажа */
export function LevelBlock() {
  const xp = useXp();
  if (!xp) return null;
  return (
    <div className="space-y-2 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 p-3 ring-1 ring-amber-200">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-orange-500 text-lg font-bold text-white shadow ring-2 ring-white">
          {xp.level}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-amber-950">
            Уровень {xp.level} · {xp.title}
          </div>
          <div className="text-xs text-amber-900/70">Всего {formatXp(xp.xp)} XP</div>
        </div>
        <div className="text-right text-xs tabular-nums text-amber-900/80">
          {formatXp(xp.levelXp)} / {formatXp(xp.nextLevelXp)} XP
          <div>до уровня {xp.level + 1}: {formatXp(xp.nextLevelXp - xp.levelXp)}</div>
        </div>
      </div>
      <XpBar xp={xp} className="h-1.5" />
      <p className="text-xs text-amber-900/70">Как считается опыт: {XP_RULE} Опыт виден только вам.</p>
    </div>
  );
}
