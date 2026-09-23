import { getProfile } from "@/features/engine/profile";
import { recommend } from "@/features/engine/recommend";
import { getAllHistory, getEmployees, getEvents, getRoleProfile } from "@/lib/store";
import type { DevEvent, HrSummary, Profile } from "@/lib/types";

function noStepReason(profile: Profile, events: DevEvent[]): string {
  if (!profile.target) {
    return "Нет цели: следующий грейд не задан, карьерная цель не выбрана.";
  }
  const requirements = getRoleProfile(profile.target.role, profile.target.grade);
  if (!requirements || !Object.keys(requirements.required_skills).length) {
    return `Нет требований к цели ${profile.target.role} · ${profile.target.grade}: оценить достижение цели нельзя.`;
  }
  if (!profile.gaps.length) {
    return `Цель достигнута по навыкам: ${profile.target.role} · ${profile.target.grade}.`;
  }
  const hasUsefulEvent = events.some(
    (event) =>
      !event.mandatory &&
      event.develops_skills.some((skill) =>
        profile.gaps.some(
          (gap) =>
            gap.skillId === skill.skill_id &&
            Math.min(gap.current + skill.gain, skill.max_level, gap.required) > gap.current,
        ),
      ),
  );
  return hasUsefulEvent
    ? "Нет доступных мероприятий по текущим условиям рекомендации; в каталоге есть активности для нужных навыков."
    : "Каталог не закрывает дефицит: нет добровольных активностей, повышающих нужные навыки.";
}

/** Пересчитывается из актуального store при каждом запросе API или страницы. */
export function getHrReport() {
  const employees = getEmployees();
  const events = getEvents();
  const skillCounts = new Map<
    string,
    HrSummary["weakSkills"][number] & { below: number; required: number }
  >();
  const noStep: HrSummary["noStep"] = [];

  for (const employee of employees) {
    const profile = getProfile(employee.employee_id);
    if (!profile) continue;
    const requirements = profile.target
      ? getRoleProfile(profile.target.role, profile.target.grade)
      : undefined;

    for (const [skillId, level] of Object.entries(requirements?.required_skills ?? {})) {
      if (level <= 0) continue;
      const key = `${employee.department}:${skillId}`;
      const count = skillCounts.get(key) ?? {
        department: employee.department,
        skillId,
        shareBelow: 0,
        below: 0,
        required: 0,
      };
      count.required += 1;
      if ((profile.effectiveSkills[skillId] ?? 0) < level) count.below += 1;
      skillCounts.set(key, count);
    }

    if (!recommend(employee.employee_id).length) {
      noStep.push({ employeeId: employee.employee_id, reason: noStepReason(profile, events) });
    }
  }

  const weakSkillRows = [...skillCounts.values()]
    .filter((row) => row.below > 0)
    .map((row) => ({ ...row, shareBelow: row.below / row.required }))
    .sort(
      (a, b) =>
        a.department.localeCompare(b.department) ||
        b.shareBelow - a.shareBelow ||
        a.skillId.localeCompare(b.skillId),
    );

  const participation = new Map<string, HrSummary["participation"][number]>();
  for (const record of getAllHistory()) {
    const status = record.status;
    if (status !== "completed" && status !== "no_show" && status !== "declined" && status !== "dropped") continue;
    const count = participation.get(record.event_id) ?? {
      eventId: record.event_id,
      completed: 0,
      no_show: 0,
      declined: 0,
      dropped: 0,
    };
    count[status] += 1;
    participation.set(record.event_id, count);
  }

  const summary: HrSummary = {
    weakSkills: weakSkillRows.map(({ department, skillId, shareBelow }) => ({ department, skillId, shareBelow })),
    noStep,
    participation: [...participation.values()].sort((a, b) => a.eventId.localeCompare(b.eventId)),
  };
  return { summary, weakSkillRows };
}
