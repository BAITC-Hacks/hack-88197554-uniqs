// Отметка активности: запись в историю + рост навыков. Наивно: навыки сотрудника правятся в store напрямую.
import { AS_OF, addHistory, getEmployee, getEvent, upsertEmployees } from "@/lib/store";
import type { ProgressDelta, ProgressRequest } from "@/lib/types";
import { getProfile, gradeProgressOf, targetProfile } from "./profile";

/** null — неизвестный сотрудник или активность. */
export function completeActivity(
  employeeId: string,
  eventId: string,
  status: ProgressRequest["status"],
): ProgressDelta | null {
  const employee = getEmployee(employeeId);
  const event = getEvent(eventId);
  const profile = getProfile(employeeId);
  if (!employee || !event || !profile) return null;

  const rp = targetProfile(profile.target);
  const before = profile.gradeProgress;
  const completed = status === "completed";

  addHistory({
    employee_id: employeeId,
    event_id: eventId,
    date: AS_OF,
    due_date: null,
    status,
    completion_pct: completed ? 100 : 0,
    score: null,
    feedback_rating: null,
    assigned_by: "self",
  });

  if (!completed) {
    return { employeeId, eventId, skills: [], gradeProgress: { before, after: before }, gradeReady: false };
  }

  const skills = event.develops_skills.map((d) => {
    const from = profile.effectiveSkills[d.skill_id] ?? 0;
    return {
      skillId: d.skill_id,
      from,
      to: Math.max(from, Math.min(from + d.gain, d.max_level)),
      required: rp?.required_skills[d.skill_id] ?? 0,
      critical: rp?.critical_skills.includes(d.skill_id) ?? false,
    };
  });
  const nextSkills = { ...employee.skills, ...Object.fromEntries(skills.map((s) => [s.skillId, s.to])) };
  upsertEmployees([{ ...employee, skills: nextSkills }]);

  const after = gradeProgressOf(nextSkills, rp);
  return {
    employeeId,
    eventId,
    skills,
    gradeProgress: { before, after },
    gradeReady: after.total > 0 && after.met === after.total,
  };
}
