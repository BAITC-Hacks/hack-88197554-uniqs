import { AS_OF, addHistory, getEvent } from "@/lib/store";
import type { ProgressDelta, ProgressRequest } from "@/lib/types";
import { alreadyCompleted, availabilityError, usefulGrowth } from "./eligibility";
import { getProfile, targetProfile } from "./profile";

export class ActivityUnavailableError extends Error {}

/** null — неизвестный сотрудник или активность; недоступная активность — ошибка. */
export function completeActivity(
  employeeId: string,
  eventId: string,
  status: ProgressRequest["status"],
): ProgressDelta | null {
  const event = getEvent(eventId);
  const profile = getProfile(employeeId);
  if (!event || !profile) return null;
  if (status !== "completed" && status !== "declined") throw new ActivityUnavailableError("Неизвестный статус активности");

  const completed = status === "completed";
  const before = profile.gradeProgress;
  const unchanged: ProgressDelta = {
    employeeId, eventId, skills: [], gradeProgress: { before, after: before },
    gradeReady: completed && !event.mandatory && before.total > 0 && before.met === before.total,
  };
  // Идемпотентный ответ даже если первое завершение закрыло все разрывы.
  if (alreadyCompleted(event, profile)) return unchanged;
  const unavailable = availabilityError(event, profile);
  if (unavailable) throw new ActivityUnavailableError(unavailable);
  if (completed && !event.mandatory && !usefulGrowth(event, profile).length) {
    throw new ActivityUnavailableError("Активность не сокращает разрыв до карьерной цели");
  }
  if (!completed && profile.history.some((h) => h.event_id === eventId && h.status === "declined" && h.date.slice(0, 10) === AS_OF)) {
    return unchanged;
  }

  // Время внутри фиксированного демо-дня отличает новое завершение от
  // снимка ревью на начало того же дня. Единственный источник роста — история.
  const date = `${AS_OF}T12:00:00.000Z`;
  if (completed && date <= profile.employee.last_review_date) {
    throw new ActivityUnavailableError("Дата ревью позже даты завершения");
  }
  addHistory({
    employee_id: employeeId,
    event_id: eventId,
    date,
    due_date: null,
    status,
    completion_pct: completed ? 100 : 0,
    score: null,
    feedback_rating: null,
    assigned_by: "self",
  });
  if (!completed) return { ...unchanged, gradeReady: false };

  const afterProfile = getProfile(employeeId)!;
  const rp = targetProfile(profile.target);
  // Обязательная учёба учитывается в фактических навыках, но не выдаёт
  // игровую награду/поздравление за добровольный квест.
  const skills: ProgressDelta["skills"] = event.mandatory ? [] : Object.entries(afterProfile.effectiveSkills)
    .filter(([skillId, to]) => to > (profile.effectiveSkills[skillId] ?? 0))
    .map(([skillId, to]) => ({
      skillId,
      from: profile.effectiveSkills[skillId] ?? 0,
      to,
      required: rp?.required_skills[skillId] ?? 0,
      critical: rp?.critical_skills.includes(skillId) ?? false,
    }));
  const after = afterProfile.gradeProgress;
  return {
    employeeId, eventId, skills, gradeProgress: { before, after },
    gradeReady: !event.mandatory && after.total > 0 && after.met === after.total,
  };
}
