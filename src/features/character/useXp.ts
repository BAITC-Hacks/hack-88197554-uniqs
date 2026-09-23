"use client";

import { useMemo } from "react";
import { useEvents } from "@/features/hud/data";
import { useClientStore } from "@/lib/client-store";
import { xpOf, type XpInfo } from "./xp";

/** опыт текущего персонажа; null, пока нет профиля или каталога */
export function useXp(): XpInfo | null {
  const profile = useClientStore((s) => s.profile);
  const events = useEvents();
  return useMemo(() => (profile && events.length > 0 ? xpOf(profile, events) : null), [profile, events]);
}
