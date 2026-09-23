// Общий контракт. Заморожен после скелета: менять только через запись в docs/DECISIONS.md.

// ── Датасет (поля как в README стартового кита) ─────────────────────────────

export type Grade = "Junior" | "Middle" | "Senior" | "Lead";
export const GRADES: Grade[] = ["Junior", "Middle", "Senior", "Lead"];

export type Department =
  | "Backend Development"
  | "Frontend Development"
  | "Data & Analytics"
  | "Quality Assurance"
  | "Product Management"
  | "Human Resources"
  | "Sales"
  | "Customer Support";

export type EventType =
  | "compliance"
  | "onboarding"
  | "course"
  | "workshop"
  | "mentoring"
  | "certification"
  | "meetup";

export type SkillId = string;

export interface Employee {
  employee_id: string;
  full_name: string;
  department: Department;
  role: string;
  grade: Grade;
  manager_id: string | null;
  hire_date: string;
  tenure_months: number;
  work_format: "office" | "hybrid" | "remote";
  preferred_language: "kk" | "ru" | "en";
  career_goal: { target_role: string; target_grade: Grade } | null;
  skills: Record<SkillId, number>;
  last_review_date: string;
}

export interface DevEvent {
  event_id: string;
  title: string;
  description: string;
  type: EventType;
  format: "online" | "offline" | "self_paced";
  duration_hours: number;
  mandatory: boolean;
  target_roles: string[];
  target_grades: Grade[];
  develops_skills: { skill_id: SkillId; gain: number; max_level: number }[];
  prerequisites: Record<SkillId, number>;
  upcoming_sessions: string[];
}

export interface Skill {
  skill_id: SkillId;
  name: string;
  type: "hard" | "soft";
  category: string;
  description: string;
}

export interface RoleProfile {
  role: string;
  grade: Grade;
  required_skills: Record<SkillId, number>;
  critical_skills: SkillId[];
}

export type HistoryStatus =
  | "completed"
  | "in_progress"
  | "dropped"
  | "no_show"
  | "declined"
  | "overdue";

export interface HistoryRecord {
  record_id: string;
  employee_id: string;
  event_id: string;
  date: string;
  due_date: string | null;
  status: HistoryStatus;
  completion_pct: number;
  score: number | null;
  feedback_rating: number | null;
  assigned_by: "self" | "manager" | "hr";
}

// ── Контракт между фичами (docs/DECISIONS.md) ───────────────────────────────

export interface Target {
  role: string;
  grade: Grade;
  source: "goal" | "next_grade";
}

export interface Gap {
  skillId: SkillId;
  current: number;
  required: number;
  critical: boolean;
}

export interface GradeProgress {
  met: number;
  total: number;
  criticalMet: number;
  criticalTotal: number;
}

export interface Profile {
  employee: Employee;
  /** null — Lead без цели */
  target: Target | null;
  /** с учётом completed после last_review_date */
  effectiveSkills: Record<SkillId, number>;
  reviewBumps: { skillId: SkillId; from: number; to: number; eventId: string }[];
  gaps: Gap[];
  gradeProgress: GradeProgress;
  history: HistoryRecord[];
}

export interface Factor {
  kind: "critical_gap" | "gap" | "goal" | "history" | "format" | "prereq" | "session";
  /** короткий чип: «System Design 3 → 4, критичен для Senior» */
  text: string;
  /** вклад в score, со знаком */
  weight: number;
}

export interface Recommendation {
  eventId: string;
  title: string;
  score: number;
  /** минимум 3 */
  factors: Factor[];
  /** null — self_paced */
  nextSession: string | null;
  /** шаблон из factors, LLM может переписать */
  explanation: string;
}

export interface ProgressDelta {
  employeeId: string;
  eventId: string;
  skills: { skillId: SkillId; from: number; to: number; required: number; critical: boolean }[];
  gradeProgress: { before: GradeProgress; after: GradeProgress };
  /** все требования цели закрыты */
  gradeReady: boolean;
}

export type AgentStep =
  | { type: "thought"; text: string }
  | { type: "tool_call"; tool: string; input: unknown }
  | { type: "tool_result"; tool: string; output: unknown }
  | { type: "tool_error"; tool: string; error: string }
  | { type: "final"; recommendations: Recommendation[] };

// ── Ответы API ──────────────────────────────────────────────────────────────

export interface ProgressRequest {
  employeeId: string;
  eventId: string;
  status: "completed" | "declined";
}

export interface MentorRequest {
  employeeId: string;
}

export interface UploadResult {
  employees: number;
  history: number;
}

export interface HrSummary {
  weakSkills: { department: Department; skillId: SkillId; shareBelow: number }[];
  noStep: { employeeId: string; reason: string }[];
  participation: {
    eventId: string;
    completed: number;
    no_show: number;
    declined: number;
    dropped: number;
  }[];
}

// ── Мир города (src/lib/world.ts) ───────────────────────────────────────────

export type PlaceKind = "office" | "venue" | "mentor" | "home" | "soon";

export interface Place {
  id: string;
  kind: PlaceKind;
  /** русское название для подписи и HUD */
  name: string;
  /** центр на земле: [x, z] */
  position: [number, number];
  /** радиус коллизии; подсказка «E — войти» появляется до radius + 2.5 */
  radius: number;
  /** куда встаёт персонаж при быстром перемещении: [x, z] */
  entrance: [number, number];
  /** для office */
  department?: Department;
  /** для venue */
  eventType?: EventType;
}

// ── Панели (src/panels.ts) ──────────────────────────────────────────────────

export type PanelId = "character" | "quests" | "mentor" | "office" | "venue" | "soon";

export interface PanelProps {
  /** место, из которого открыта панель (для office / venue / soon) */
  placeId?: string;
}
