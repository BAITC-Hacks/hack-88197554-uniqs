import type { DevEvent, Factor, GradeProgress, Profile, Recommendation, RoleProfile, Skill, Target } from "@/lib/types";

export interface SkillFit {
  skillId: string;
  name: string;
  current: number;
  required: number;
  critical: boolean;
  met: boolean;
}

export interface CareerStep extends Recommendation {
  hours: number;
  format: DevEvent["format"];
  eventType: DevEvent["type"];
  skillIds: string[];
}

export interface CareerPath {
  id: string;
  target: Target;
  skills: SkillFit[];
  progress: GradeProgress;
  steps: CareerStep[];
  uncoveredSkillIds: string[];
}

export interface CareerPreview {
  employeeId: string;
  asOf: string;
  paths: CareerPath[];
}

export const pathId = (role: string, grade: string) => `${role}::${grade}`;

/** Eligibility always uses the employee's CURRENT role and grade, even when trying another role. */
export function eligibleNow(event: DevEvent, profile: Profile, asOf: string): boolean {
  if (event.mandatory || !event.target_roles.includes(profile.employee.role) || !event.target_grades.includes(profile.employee.grade)) return false;
  if (profile.history.some(h => h.event_id === event.event_id && h.status === "completed" && (event.event_id !== "EV_036" || h.date === asOf))) return false;
  if (Object.entries(event.prerequisites).some(([id, level]) => (profile.effectiveSkills[id] ?? 0) < level)) return false;
  return event.format === "self_paced" || event.upcoming_sessions.some(date => date >= asOf);
}

export function benefitsOf(event: DevEvent, profile: Profile) {
  return event.develops_skills.flatMap(skill => {
    const gap = profile.gaps.find(g => g.skillId === skill.skill_id);
    if (!gap) return [];
    const current = profile.effectiveSkills[gap.skillId] ?? 0;
    const to = Math.min(current + skill.gain, skill.max_level, gap.required, 5);
    return to > current ? [{ ...gap, current, to, weight: (to - current) * (gap.critical ? 2 : 1) }] : [];
  }).sort((a, b) => b.weight - a.weight || a.skillId.localeCompare(b.skillId));
}

export function projectRole(profile: Profile, role: RoleProfile, events: DevEvent[], catalog: Skill[], asOf: string): CareerPath {
  const names = new Map(catalog.map(skill => [skill.skill_id, skill.name]));
  const skills: SkillFit[] = Object.entries(role.required_skills).map(([skillId, required]) => {
    const current = profile.effectiveSkills[skillId] ?? 0;
    return { skillId, name: names.get(skillId) ?? skillId, current, required, critical: role.critical_skills.includes(skillId), met: current >= required };
  }).sort((a, b) => Number(a.met) - Number(b.met) || Number(b.critical) - Number(a.critical) || a.name.localeCompare(b.name));
  const target: Target = { role: role.role, grade: role.grade, source: "goal" };
  const simulated: Profile = { ...profile, target, gaps: skills.filter(s => !s.met) };
  const ranked: CareerStep[] = events.flatMap(event => {
    if (!eligibleNow(event, simulated, asOf)) return [];
    const benefits = benefitsOf(event, simulated);
    const best = benefits[0];
    if (!best) return [];
    const nextSession = event.format === "self_paced" ? null : [...event.upcoming_sessions].sort().find(date => date >= asOf) ?? null;
    const factors: Factor[] = [{
      kind: best.critical ? "critical_gap" : "gap",
      text: `${names.get(best.skillId) ?? best.skillId}: ${best.current} → ${best.to} из ${best.required}${best.critical ? " · ключевой навык" : ""}`,
      weight: benefits.reduce((sum, benefit) => sum + benefit.weight, 0),
    }, {
      kind: "goal", text: `Помогает перейти в ${role.role} · ${role.grade}`, weight: 0,
    }, {
      kind: "prereq", text: "Подходит вашей текущей роли и грейду; требования к участию выполнены", weight: 0,
    }, {
      kind: "session", text: nextSession ? `Ближайшая сессия ${nextSession}` : "Можно начать в своём темпе", weight: 0,
    }];
    const disliked = profile.history.filter(h => ["declined", "no_show", "dropped"].includes(h.status)).filter(h => {
      const previous = events.find(e => e.event_id === h.event_id);
      return previous && (previous.type === event.type || previous.format === event.format);
    }).length;
    if (disliked) factors.push({ kind: "history", text: "Похожие активности раньше откладывались — учитываем это при выборе", weight: -Math.min(2, disliked * 0.25) });
    if (profile.employee.work_format === "remote") factors.push({ kind: "format", text: event.format === "offline" ? "Потребуется приехать на очное занятие" : "Можно пройти удалённо", weight: event.format === "offline" ? -0.5 : 0.5 });
    return [{ eventId: event.event_id, title: event.title, score: factors.reduce((sum, f) => sum + f.weight, 0), factors, nextSession,
      explanation: factors.map(f => f.text).join(". "), hours: event.duration_hours, format: event.format, eventType: event.type, skillIds: benefits.map(b => b.skillId) }];
  });
  ranked.sort((a, b) => b.score - a.score || a.eventId.localeCompare(b.eventId));
  return {
    id: pathId(role.role, role.grade), target, skills,
    progress: { met: skills.filter(s => s.met).length, total: skills.length, criticalMet: skills.filter(s => s.critical && s.met).length, criticalTotal: skills.filter(s => s.critical).length },
    steps: ranked.slice(0, 3),
    uncoveredSkillIds: skills.filter(s => !s.met && !ranked.some(step => step.skillIds.includes(s.skillId))).map(s => s.skillId),
  };
}
