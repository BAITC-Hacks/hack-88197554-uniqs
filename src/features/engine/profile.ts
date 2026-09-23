// Наивный профиль: сырые навыки без доначисления после ревью. Настоящую логику делает фича engine.
import { getEmployee, getHistory, getRoleProfile } from "@/lib/store";
import { GRADES, type Employee, type Gap, type GradeProgress, type Profile, type RoleProfile, type Target } from "@/lib/types";

export function targetFor(employee: Employee): Target | null {
  if (employee.career_goal) {
    return { role: employee.career_goal.target_role, grade: employee.career_goal.target_grade, source: "goal" };
  }
  const next = GRADES[GRADES.indexOf(employee.grade) + 1];
  return next ? { role: employee.role, grade: next, source: "next_grade" } : null;
}

export function targetProfile(target: Target | null): RoleProfile | undefined {
  return target ? getRoleProfile(target.role, target.grade) : undefined;
}

export function gradeProgressOf(skills: Record<string, number>, rp: RoleProfile | undefined): GradeProgress {
  if (!rp) return { met: 0, total: 0, criticalMet: 0, criticalTotal: 0 };
  const req = Object.entries(rp.required_skills);
  return {
    met: req.filter(([s, lvl]) => (skills[s] ?? 0) >= lvl).length,
    total: req.length,
    criticalMet: rp.critical_skills.filter((s) => (skills[s] ?? 0) >= (rp.required_skills[s] ?? 0)).length,
    criticalTotal: rp.critical_skills.length,
  };
}

export function getProfile(id: string): Profile | null {
  const employee = getEmployee(id);
  if (!employee) return null;
  const target = targetFor(employee);
  const rp = targetProfile(target);
  const effectiveSkills = { ...employee.skills };
  const gaps: Gap[] = rp
    ? Object.entries(rp.required_skills)
        .filter(([s, required]) => (effectiveSkills[s] ?? 0) < required)
        .map(([s, required]) => ({
          skillId: s,
          current: effectiveSkills[s] ?? 0,
          required,
          critical: rp.critical_skills.includes(s),
        }))
    : [];
  return {
    employee,
    target,
    effectiveSkills,
    reviewBumps: [],
    gaps,
    gradeProgress: gradeProgressOf(effectiveSkills, rp),
    history: getHistory(id),
  };
}
