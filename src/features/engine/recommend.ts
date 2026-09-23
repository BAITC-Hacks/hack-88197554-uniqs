import { getEvent, getEvents, getSkill } from "@/lib/store";
import type { DevEvent, Factor, Profile, Recommendation } from "@/lib/types";
import { alreadyCompleted, availabilityError, nextSessionOf, usefulGrowth } from "./eligibility";
import { getProfile } from "./profile";

export { nextSessionOf } from "./eligibility";

function historyFactors(event: DevEvent, profile: Profile): Factor[] {
  const factors: Factor[] = [];
  const voluntary = profile.history.flatMap((record) => {
    const previous = getEvent(record.event_id);
    return previous && !previous.mandatory ? [{ record, previous }] : [];
  });
  for (const dimension of ["type", "format"] as const) {
    const similar = voluntary.filter(({ previous }) => previous[dimension] === event[dimension]);
    const completed = similar.filter(({ record }) => record.status === "completed").length;
    const negative = similar.filter(({ record }) => ["no_show", "dropped", "declined"].includes(record.status));
    if (!completed && !negative.length) continue;
    const label = dimension === "type" ? `типу ${event.type}` : `формату ${event.format}`;
    factors.push({
      kind: dimension === "type" ? "history" : "format",
      text: `По ${label}: завершено ${completed}, пропусков/отказов/брошенных ${negative.length}`,
      // Сигнал ограничен: история влияет на выбор, но не заглушает пользу навыков.
      weight: Math.max(-3, Math.min(1.5, completed * 0.5 - negative.length)),
    });
  }
  if (!factors.length) factors.push({
    kind: "history",
    text: "Нет завершений или отказов по похожему типу и формату; предпочтение неизвестно",
    weight: 0,
  });
  return factors;
}

function score(event: DevEvent, profile: Profile): Recommendation | null {
  if (event.mandatory || alreadyCompleted(event, profile) || availabilityError(event, profile)) return null;
  const closes = usefulGrowth(event, profile);
  if (!closes.length || !profile.target) return null;

  const factors: Factor[] = closes.map(({ gap, to, closed }) => ({
    kind: gap.critical ? "critical_gap" : "gap",
    text: `${getSkill(gap.skillId)?.name ?? gap.skillId} ${gap.current} → ${to}; требуется ${gap.required}${gap.critical ? ", критичный навык" : ""}`,
    // Учитываем и полезный gain, и исходный размер разрыва до цели.
    weight: closed * (gap.critical ? 4 : 2) + (gap.required - gap.current) * (gap.critical ? 1 : 0.5),
  }));
  const nextSession = nextSessionOf(event);
  factors.push(
    {
      kind: "goal",
      text: `${profile.target.source === "goal" ? "Карьерная цель" : "Следующий грейд"}: ${profile.target.role}, ${profile.target.grade}`,
      weight: 0,
    },
    ...historyFactors(event, profile),
    {
      kind: "session",
      text: nextSession ? `Ближайшая сессия ${nextSession}` : "Самостоятельное обучение в своём темпе",
      weight: 0,
    },
    {
      kind: "prereq",
      text: Object.keys(event.prerequisites).length
        ? `Требования выполнены: ${Object.entries(event.prerequisites).map(([skill, level]) => `${getSkill(skill)?.name ?? skill} ${profile.effectiveSkills[skill] ?? 0} ≥ ${level}`).join(", ")}`
        : "Без предварительных требований",
      weight: 0,
    },
  );
  return {
    eventId: event.event_id,
    title: event.title,
    score: factors.reduce((sum, factor) => sum + factor.weight, 0),
    factors,
    nextSession,
    explanation: factors.map((factor) => factor.text).join("; ") + ".",
  };
}

export function recommend(id: string): Recommendation[] {
  const profile = getProfile(id);
  if (!profile) return [];
  return getEvents()
    .map((event) => score(event, profile))
    .filter((recommendation) => recommendation !== null)
    .sort((a, b) => b.score - a.score || a.eventId.localeCompare(b.eventId))
    .slice(0, 3);
}
