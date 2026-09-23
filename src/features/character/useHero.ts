"use client";

import { useMemo } from "react";
import { GRADE_CHARACTER, useAvatar } from "@/features/city/avatar";
import type { CharacterId } from "@/features/city/models";
import { useEvents } from "@/features/hud/data";
import { useClientStore } from "@/lib/client-store";
import { gearFor, gearStats, resolveGear, trophiesOf } from "./gear";
import { useGearPicks, useHeroNick } from "./heroStore";
import { useXp } from "./useXp";
import { eventIndex } from "./xp";

/** класс героя: ручной выбор или по грейду */
export function useHeroClass(): { hero: CharacterId; manual: boolean } {
  const manual = useAvatar();
  const grade = useClientStore((s) => s.profile?.employee.grade ?? "Junior");
  return { hero: manual ?? GRADE_CHARACTER[grade], manual: !!manual };
}

/** всё для листа героя: класс, ник, экипировка, трофеи */
export function useHero() {
  const profile = useClientStore((s) => s.profile);
  const events = useEvents();
  const xp = useXp();
  const { hero, manual } = useHeroClass();
  const employeeId = profile?.employee.employee_id;
  const nick = useHeroNick(employeeId);
  const picks = useGearPicks(employeeId, hero);

  const byId = useMemo(() => eventIndex(events), [events]);
  const history = profile?.history;
  const stats = useMemo(() => gearStats(history ?? [], byId, xp?.level ?? 1), [history, byId, xp?.level]);
  const items = useMemo(() => gearFor(hero), [hero]);
  const equipped = useMemo(() => resolveGear(items, stats, picks), [items, stats, picks]);
  const trophies = useMemo(() => trophiesOf(history ?? [], byId), [history, byId]);

  return { profile, events, byId, xp, hero, manual, nick, stats, items, equipped, trophies };
}
