import type { Department, DevEvent, Employee, Gap, Target } from "@/lib/types";
import type { getHrReport } from "./summary";

export type HrRole = "admin" | "hr" | "manager" | "employee";
export const ROLE_LABELS: Record<HrRole, string> = { admin: "Администратор", hr: "HR", manager: "Руководитель", employee: "Сотрудник" };
export type Permission = "overview" | "profiles" | "plans" | "access";
export const PERMISSION_LABELS: Record<Permission, string> = { overview: "Обзор команды", profiles: "Карточки сотрудников", plans: "Создание и изменение планов", access: "Управление доступом" };
export type Permissions = Record<Permission, boolean>;
export const ROLE_PERMISSIONS: Record<HrRole, Permissions> = {
  admin: { overview: true, profiles: true, plans: true, access: true },
  hr: { overview: true, profiles: true, plans: true, access: false },
  manager: { overview: true, profiles: true, plans: true, access: false },
  employee: { overview: false, profiles: false, plans: false, access: false },
};
export interface Account {
  id: string; login: string; name: string; role: HrRole; employeeId: string | null;
  departments: Department[]; permissions: Permissions; enabled: boolean;
}
export interface PlanStep { eventId: string; dueDate: string; }
export interface LearningPlan {
  id: string; employeeId: string; title: string; goal: string; note: string;
  steps: PlanStep[]; state: "draft" | "published" | "archived";
  response: "pending" | "accepted" | "declined"; createdBy: string; createdAt: string; updatedAt: string;
  baselineHistoryIds: string[];
}
export interface PlanView extends LearningPlan {
  employeeName: string; department: Department; completedEventIds: string[]; totalHours: number;
}
export interface EmployeeView {
  id: string; name: string; department: Department; role: string; grade: Employee["grade"];
  target: Target | null; skills: Record<string, number>; requirements: Record<string, number>;
  gaps: Gap[]; met: number; total: number; planCount: number;
}
export interface SkillOverview {
  id: string; name: string; category: string; average: number; requiredAverage: number;
  assessed: number; below: number; criticalBelow: number;
}
export interface HrWorkspace {
  report: ReturnType<typeof getHrReport> | null;
  account: Account; asOf: string; departments: Department[]; employees: EmployeeView[];
  skills: { id: string; name: string }[]; plans: PlanView[];
  overview: { employees: number; withGaps: number; withoutPlan: number; activePlans: number; skills: SkillOverview[] } | null;
  accounts: Account[] | null;
  directory: { id: string; name: string; department: Department }[];
  events: Pick<DevEvent, "event_id" | "title" | "duration_hours" | "type">[];
}
export interface Candidate {
  eventId: string; title: string; hours: number; format: DevEvent["format"]; nextSession: string | null;
  reasons: string[]; gains: { skillId: string; name: string; from: number; to: number }[]; score: number;
}
