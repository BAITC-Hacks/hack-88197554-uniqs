"use client";

// Кнопка листа героя в верхней панели: иконка класса, ник или имя, уровень, клавиша C.

import { actions, useClientStore } from "@/lib/client-store";
import { CLASS_ICON } from "./gear";
import { useHeroNick } from "./heroStore";
import { useHeroClass } from "./useHero";
import { useXp } from "./useXp";
import { LevelBadge } from "./XpLevel";

export function HeroButton() {
  const employee = useClientStore((s) => s.profile?.employee);
  const { hero } = useHeroClass();
  const nick = useHeroNick(employee?.employee_id);
  const xp = useXp();
  const Icon = CLASS_ICON[hero];
  const name = nick ?? employee?.full_name ?? "Герой";

  return (
    <button
      type="button"
      title="Лист героя · клавиша C"
      aria-label={`Лист героя: ${name}`}
      onClick={() => actions.openPanel("character")}
      className="group flex h-10 items-center gap-2 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-white py-1 pr-2 pl-1 text-sm shadow-xs transition-colors hover:border-amber-300 hover:from-amber-100"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-slate-700 to-slate-900 text-amber-300 ring-2 ring-amber-400">
        <Icon className="size-4" />
      </span>
      <span className="max-w-40 truncate font-medium">{name}</span>
      {xp && <LevelBadge level={xp.level} />}
      <kbd className="rounded border bg-white px-1.5 text-[11px] text-muted-foreground">C</kbd>
    </button>
  );
}
