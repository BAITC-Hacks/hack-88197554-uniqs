import { AS_OF, getEmployee, getEvent, getEvents, getHistory, getRoleProfile, getSkills } from "@/lib/store";
import { getProfile } from "@/features/engine/profile";
import type { Employee } from "@/lib/types";
import type { Candidate, EmployeeView, SkillOverview } from "./types";

export function employeeView(employee: Employee): EmployeeView {
  const profile = getProfile(employee.employee_id)!;
  const target = profile.target;
  const requirement = target ? getRoleProfile(target.role, target.grade) : undefined;
  const skills = profile.effectiveSkills;
  const requirements = requirement?.required_skills ?? {};
  const progress = profile.gradeProgress;
  return {
    id: employee.employee_id, name: employee.full_name, department: employee.department,
    role: employee.role, grade: employee.grade, target, skills, requirements,
    gaps: Object.entries(requirements).filter(([id, level]) => (skills[id] ?? 0) < level)
      .map(([skillId, required]) => ({ skillId, current: skills[skillId] ?? 0, required, critical: requirement?.critical_skills.includes(skillId) ?? false })),
    met: progress.met, total: progress.total, planCount: 0,
  };
}

export function skillOverview(employees: EmployeeView[]): SkillOverview[] {
  return getSkills().flatMap((skill) => {
    const relevant = employees.filter((e) => e.requirements[skill.skill_id] !== undefined);
    if (!relevant.length) return [];
    return [{
      id: skill.skill_id, name: skill.name, category: skill.category, assessed: relevant.length,
      average: relevant.reduce((sum, e) => sum + (e.skills[skill.skill_id] ?? 0), 0) / relevant.length,
      requiredAverage: relevant.reduce((sum, e) => sum + e.requirements[skill.skill_id], 0) / relevant.length,
      below: relevant.filter((e) => e.gaps.some((g) => g.skillId === skill.skill_id)).length,
      criticalBelow: relevant.filter((e) => e.gaps.some((g) => g.skillId === skill.skill_id && g.critical)).length,
    }];
  }).sort((a, b) => b.criticalBelow - a.criticalBelow || b.below - a.below || a.name.localeCompare(b.name));
}

export function candidatesFor(employeeId: string): Candidate[] {
  const employee = getEmployee(employeeId);
  if (!employee) return [];
  const view = employeeView(employee);
  const history = getHistory(employeeId);
  const names = new Map(getSkills().map((s) => [s.skill_id, s.name]));
  return getEvents().flatMap((event): Candidate[] => {
    if (event.mandatory || !event.target_roles.includes(employee.role) || !event.target_grades.includes(employee.grade)) return [];
    if (history.some((h) => h.event_id === event.event_id && h.status === "completed" && h.date.slice(0, 10) <= AS_OF && (event.event_id !== "EV_036" || h.date.slice(0, 10) === AS_OF))) return [];
    if (Object.entries(event.prerequisites).some(([s, level]) => (view.skills[s] ?? 0) < level)) return [];
    const nextSession = [...event.upcoming_sessions].sort().find((d) => d >= AS_OF) ?? null;
    if (event.format !== "self_paced" && !nextSession) return [];
    const gains = event.develops_skills.flatMap((gain) => {
      const gap = view.gaps.find((g) => g.skillId === gain.skill_id);
      if (!gap) return [];
      const to = Math.min(5, gap.required, gain.max_level, gap.current + gain.gain);
      return to > gap.current ? [{ skillId: gain.skill_id, name: names.get(gain.skill_id) ?? gain.skill_id, from: gap.current, to }] : [];
    });
    if (!gains.length) return [];
    const negative = history.filter((h) => ["declined", "dropped", "no_show"].includes(h.status) && (getEvent(h.event_id)?.format === event.format || getEvent(h.event_id)?.type === event.type)).length;
    const critical = gains.filter((gain) => view.gaps.some((g) => g.skillId === gain.skillId && g.critical)).length;
    const formatFits = employee.work_format !== "remote" || event.format !== "offline";
    const reasons = [
      `Для цели ${view.target?.role ?? employee.role} · ${view.target?.grade ?? employee.grade}: ${gains.map((g) => `${g.name} ${g.from} → ${g.to}`).join(", ")}.`,
      critical ? `Развивает ключевые навыки: ${critical}.` : "Сокращает разрыв до выбранной цели.",
      formatFits ? "Формат совместим с режимом работы." : "Очное участие потребует согласования для удалённого сотрудника.",
      negative ? `В истории есть отказы или незавершённые активности похожего типа/формата (${negative}); обсудите выбор.` : "В истории нет отказов от похожего типа или формата.",
    ];
    return [{ eventId: event.event_id, title: event.title, hours: event.duration_hours, format: event.format, nextSession, reasons, gains, score: gains.reduce((sum, g) => sum + g.to - g.from, 0) + critical * 2 + Number(formatFits) - Math.min(negative, 3) }];
  }).sort((a, b) => b.score - a.score || a.eventId.localeCompare(b.eventId));
}
