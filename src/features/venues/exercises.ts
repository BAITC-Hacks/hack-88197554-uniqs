// Клиентская часть практики: публичные типы заданий и правила участия.
// Банк заданий с эталонами живёт на сервере (./tasks) и сюда не импортируется.
import type { DevEvent, Profile, ProgressDelta } from "@/lib/types";

/** Компания города, от которой приходит задание: башня отдела по теме активности. */
export interface Company { name: string; about: string }

export interface PublicCodeTask {
  kind: "python" | "ts";
  company: Company;
  title: string;
  brief: string;
  takeaway: string;
  fileName: string;
  example: { call: string; result: string; note: string };
  starter: string;
  tests: { label: string; call: string }[];
  hints: string[];
}
export interface PublicQuestion {
  prompt: string;
  codeOptions: boolean;
  options: string[];
  hint: string;
}
export interface PublicQuizTask {
  kind: "quiz";
  company: Company;
  title: string;
  brief: string;
  takeaway: string;
  questions: PublicQuestion[];
}
export type PublicTask = PublicCodeTask | PublicQuizTask;

export interface CheckResult {
  label: string;
  passed: boolean;
  detail: string;
}
export interface PracticeResult {
  passed: boolean;
  checks: CheckResult[];
  /** оценка решения 0–100, есть при успешной проверке */
  score?: number;
  delta?: ProgressDelta;
  error?: string;
}

export const SCORE_RULE = "Оценка решения: 100 за первую попытку без подсказок, −10 за каждую повторную проверку и каждую подсказку, минимум 50.";

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10; const mod100 = n % 100;
  return forms[mod10 === 1 && mod100 !== 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2];
}

export const languageOf = (task: PublicTask) => task.kind === "python" ? "Python" : task.kind === "ts" ? "TypeScript" : "Рабочий кейс";

export function taskSummary(task: PublicTask): string {
  if (task.kind === "quiz") {
    const n = task.questions.length;
    return `Решить ${n} ${plural(n, ["рабочую ситуацию", "рабочие ситуации", "рабочих ситуаций"])}`;
  }
  const n = task.tests.length;
  return `Написать код на ${languageOf(task)} и пройти ${n} ${plural(n, ["проверку", "проверки", "проверок"])}`;
}

const TODAY = "2026-10-01";

/** Как engine/eligibility: регулярный клуб EV_036 можно пройти снова в другой день. Даты истории бывают с временем. */
export function alreadyCompleted(event: DevEvent, profile: Profile): boolean {
  return profile.history.some(record => record.event_id === event.event_id && record.status === "completed"
    && (event.event_id !== "EV_036" || record.date.slice(0, 10) === TODAY));
}

export function participationBlock(event: DevEvent, profile: Profile): string | null {
  if (event.mandatory) return "Обязательное обучение не начисляет навыки в практике.";
  if (alreadyCompleted(event, profile)) return "Активность уже выполнена.";
  if (!event.target_roles.includes(profile.employee.role) || !event.target_grades.includes(profile.employee.grade)) return "Активность рассчитана на другую роль или грейд.";
  const missing = Object.entries(event.prerequisites).filter(([id, level]) => (profile.effectiveSkills[id] ?? 0) < level);
  if (missing.length) return "Сначала закройте предварительные требования активности.";
  if (event.format !== "self_paced" && !event.upcoming_sessions.some(date => date.slice(0, 10) >= TODAY)) return "Нет будущей сессии: активность пока нельзя засчитать.";
  const useful = event.develops_skills.some(skill => {
    const gap = profile.gaps.find(gap => gap.skillId === skill.skill_id);
    return gap && gap.current < Math.min(gap.required, skill.max_level) && skill.gain > 0;
  });
  return useful ? null : "Эта активность уже не закрывает разрывы до вашей цели.";
}
