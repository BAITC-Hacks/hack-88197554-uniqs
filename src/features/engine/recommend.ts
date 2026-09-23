// Наивные рекомендации: фильтры из CLAUDE.md + score = закрываемый разрыв. Настоящую логику делает фича engine.
import { AS_OF, getEvents, getSkill } from "@/lib/store";
import type { DevEvent, Factor, Profile, Recommendation } from "@/lib/types";
import { getProfile } from "./profile";

const REPEATABLE = new Set(["EV_036"]);

export function nextSessionOf(event: DevEvent): string | null {
  return [...event.upcoming_sessions].sort().find((d) => d >= AS_OF) ?? null;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function score(event: DevEvent, profile: Profile): Recommendation | null {
  const { employee, effectiveSkills, gaps, target } = profile;
  if (event.mandatory) return null;
  if (!event.target_roles.includes(employee.role) || !event.target_grades.includes(employee.grade)) return null;
  const done = profile.history.some((h) => h.event_id === event.event_id && h.status === "completed");
  if (done && !REPEATABLE.has(event.event_id)) return null;
  const prereqs = Object.entries(event.prerequisites);
  if (prereqs.some(([s, lvl]) => (effectiveSkills[s] ?? 0) < lvl)) return null;

  const closes = event.develops_skills
    .map((d) => {
      const gap = gaps.find((g) => g.skillId === d.skill_id);
      if (!gap) return null;
      const to = Math.min(gap.current + d.gain, d.max_level, gap.required);
      const closed = to - gap.current;
      return closed > 0 ? { gap, to, weight: closed * (gap.critical ? 2 : 1) } : null;
    })
    .filter((c) => c !== null)
    .sort((a, b) => b.weight - a.weight);
  if (!closes.length) return null;

  const best = closes[0];
  const skillName = getSkill(best.gap.skillId)?.name ?? best.gap.skillId;
  const grade = target?.grade ?? employee.grade;
  const nextSession = nextSessionOf(event);
  const factors: Factor[] = [
    {
      kind: best.gap.critical ? "critical_gap" : "gap",
      text: `${skillName} ${best.gap.current} → ${best.to}, ${best.gap.critical ? "критичен" : "нужен"} для ${grade}`,
      weight: best.weight,
    },
    {
      kind: "session",
      text: nextSession
        ? `Ближайшая сессия ${nextSession}`
        : event.format === "self_paced"
          ? "В своём темпе"
          : "Дата сессии уточняется",
      weight: 0,
    },
    {
      kind: "prereq",
      text: prereqs.length ? "Требования к участию выполнены" : "Без предварительных требований",
      weight: 0,
    },
  ];
  return {
    eventId: event.event_id,
    title: event.title,
    score: closes.reduce((sum, c) => sum + c.weight, 0),
    factors,
    nextSession,
    explanation: factors.map((f, i) => (i === 0 ? f.text : lowerFirst(f.text))).join("; ") + ".",
  };
}

export function recommend(id: string): Recommendation[] {
  const profile = getProfile(id);
  if (!profile) return [];
  return getEvents()
    .map((e) => score(e, profile))
    .filter((r) => r !== null)
    .sort((a, b) => b.score - a.score || a.eventId.localeCompare(b.eventId))
    .slice(0, 3);
}
