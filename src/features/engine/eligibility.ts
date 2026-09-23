import { AS_OF } from "@/lib/store";
import type { DevEvent, Profile } from "@/lib/types";

export function nextSessionOf(event: DevEvent): string | null {
  if (event.format === "self_paced") return null;
  return [...event.upcoming_sessions].sort().find((date) => date.slice(0, 10) >= AS_OF) ?? null;
}

export function alreadyCompleted(event: DevEvent, profile: Profile): boolean {
  return profile.history.some((h) => h.event_id === event.event_id && h.status === "completed"
    // В контракте нет sessionId: повторный клуб допускается в другой день,
    // а повторный POST в один день не выдаёт ещё одно начисление.
    && (event.event_id !== "EV_036" || h.date.slice(0, 10) === AS_OF));
}

export function availabilityError(event: DevEvent, profile: Profile): string | null {
  if (!event.target_roles.includes(profile.employee.role)) return "Активность недоступна для этой роли";
  if (!event.target_grades.includes(profile.employee.grade)) return "Активность недоступна для этого грейда";
  if (Object.entries(event.prerequisites).some(([skill, level]) => (profile.effectiveSkills[skill] ?? 0) < level)) {
    return "Не выполнены предварительные требования";
  }
  if (event.format !== "self_paced" && !nextSessionOf(event)) return "Нет доступной будущей сессии";
  return null;
}

export function usefulGrowth(event: DevEvent, profile: Profile) {
  return event.develops_skills.flatMap((developed) => {
    const gap = profile.gaps.find((g) => g.skillId === developed.skill_id);
    if (!gap) return [];
    const to = Math.min(gap.current + developed.gain, developed.max_level, gap.required);
    return to > gap.current ? [{ gap, to, closed: to - gap.current }] : [];
  });
}
