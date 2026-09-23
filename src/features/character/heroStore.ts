// Ник героя и выбранная экипировка: по employee_id, в localStorage.
// Без localStorage (приватное окно, SSR) живёт в памяти вкладки.

import { useSyncExternalStore } from "react";
import type { CharacterId } from "@/features/city/models";
import type { GearPicks, SlotId } from "./gear";

interface HeroRecord {
  nick?: string;
  gear?: Partial<Record<CharacterId, GearPicks>>;
}
type HeroState = Record<string, HeroRecord>;

const KEY = "cq.hero.v1";
const EMPTY: HeroState = {};
const NO_PICKS: GearPicks = {};
export const NICK_MAX = 24;

let state: HeroState | null = null;
const listeners = new Set<() => void>();

function read(): HeroState {
  if (state) return state;
  let loaded: unknown = null;
  try {
    loaded = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    loaded = null;
  }
  state = loaded && typeof loaded === "object" ? (loaded as HeroState) : {};
  return state;
}

function write(employeeId: string, patch: (r: HeroRecord) => HeroRecord) {
  const cur = read();
  state = { ...cur, [employeeId]: patch(cur[employeeId] ?? {}) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // без хранилища — только в памяти
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useHeroState(): HeroState {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useHeroNick(employeeId: string | undefined): string | null {
  const s = useHeroState();
  return (employeeId && s[employeeId]?.nick) || null;
}

export function setHeroNick(employeeId: string, nick: string) {
  const clean = nick.trim().slice(0, NICK_MAX);
  write(employeeId, (r) => ({ ...r, nick: clean || undefined }));
}

export function useGearPicks(employeeId: string | undefined, hero: CharacterId): GearPicks {
  const s = useHeroState();
  return (employeeId && s[employeeId]?.gear?.[hero]) || NO_PICKS;
}

/** itemId — надеть, null — снять */
export function setGearPick(employeeId: string, hero: CharacterId, slot: SlotId, itemId: string | null) {
  write(employeeId, (r) => ({ ...r, gear: { ...r.gear, [hero]: { ...r.gear?.[hero], [slot]: itemId } } }));
}
