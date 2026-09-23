// Банк заданий по event_id + проверка решений. Только сервер: здесь эталоны и правильные ответы.
import { DEPARTMENT_COMPANY } from "@/features/city/companies";
import type { Department, DevEvent } from "@/lib/types";
import type { CheckResult, Company, PublicTask } from "../exercises";
import { runPython } from "../python";
import { runTypeScript } from "../typescript";
import { CLIENT_TASKS } from "./clients";
import { DATA_TASKS } from "./data";
import { ENGINEERING_TASKS } from "./engineering";
import { fallbackTask } from "./fallback";
import { FRONTEND_TASKS } from "./frontend";
import { PEOPLE_TASKS } from "./people";
import { PRODUCT_TASKS } from "./product";
import { QUALITY_TASKS } from "./quality";
import { SOFT_TASKS } from "./soft";
import type { CodeTask, Json, QuizTask, Task } from "./types";

export const TASK_BANK: Record<string, Task> = {
  ...ENGINEERING_TASKS, ...FRONTEND_TASKS, ...QUALITY_TASKS, ...DATA_TASKS,
  ...PRODUCT_TASKS, ...PEOPLE_TASKS, ...CLIENT_TASKS, ...SOFT_TASKS,
};

/** Для какой активности написано задание и башня какого отдела его выдаёт.
 * Если жюри загрузит другое событие с тем же id (другое название), берём нейтральный кейс. */
export const BANK_EVENTS: Record<string, { title: string; department: Department }> = {
  EV_005: { title: "System Design Fundamentals", department: "Backend Development" },
  EV_006: { title: "Designing High-Load Systems", department: "Backend Development" },
  EV_007: { title: "Architecture Review Circle", department: "Backend Development" },
  EV_008: { title: "Business Writing & Documentation", department: "Product Management" },
  EV_009: { title: "Cloud Certification Prep", department: "Backend Development" },
  EV_010: { title: "Kubernetes in Practice", department: "Backend Development" },
  EV_011: { title: "Secure Coding Workshop", department: "Backend Development" },
  EV_012: { title: "Advanced Python", department: "Data & Analytics" },
  EV_013: { title: "TypeScript in Depth", department: "Frontend Development" },
  EV_014: { title: "Web Performance Deep Dive", department: "Frontend Development" },
  EV_015: { title: "Web Performance Fundamentals", department: "Frontend Development" },
  EV_016: { title: "Accessible Interfaces", department: "Frontend Development" },
  EV_017: { title: "React Patterns & State Management", department: "Frontend Development" },
  EV_018: { title: "Test Automation Bootcamp", department: "Quality Assurance" },
  EV_019: { title: "API & Performance Testing Workshop", department: "Quality Assurance" },
  EV_020: { title: "Applied Statistics for Analysts", department: "Data & Analytics" },
  EV_021: { title: "A/B Testing Workshop", department: "Data & Analytics" },
  EV_022: { title: "SQL & BI for Analytics", department: "Data & Analytics" },
  EV_023: { title: "Data Storytelling & Visualization", department: "Data & Analytics" },
  EV_024: { title: "Machine Learning for Analysts", department: "Data & Analytics" },
  EV_025: { title: "Dimensional Data Modeling", department: "Data & Analytics" },
  EV_026: { title: "Product Discovery Lab", department: "Product Management" },
  EV_027: { title: "Roadmapping & Agile Planning", department: "Product Management" },
  EV_028: { title: "Labor Law & Employee Relations", department: "Human Resources" },
  EV_029: { title: "People Analytics & Total Rewards", department: "Human Resources" },
  EV_030: { title: "Structured Interviewing", department: "Human Resources" },
  EV_031: { title: "Designing Learning Programs", department: "Human Resources" },
  EV_032: { title: "Negotiation Masterclass", department: "Sales" },
  EV_033: { title: "Consultative Selling & Prospecting", department: "Sales" },
  EV_034: { title: "Handling Difficult Conversations", department: "Customer Support" },
  EV_035: { title: "Technical Troubleshooting Academy", department: "Customer Support" },
  EV_036: { title: "Public Speaking Club", department: "Human Resources" },
  EV_037: { title: "Mentor Track", department: "Human Resources" },
  EV_038: { title: "Leadership Foundations", department: "Human Resources" },
  EV_039: { title: "Time & Priority Management", department: "Human Resources" },
  EV_040: { title: "Structured Problem Solving", department: "Product Management" },
};

const ROLE_DEPARTMENT: Record<string, Department> = {
  "Backend Engineer": "Backend Development", "Frontend Engineer": "Frontend Development", "Data Analyst": "Data & Analytics",
  "QA Engineer": "Quality Assurance", "Product Manager": "Product Management", "HR Business Partner": "Human Resources",
  "Sales Manager": "Sales", "Customer Support Specialist": "Customer Support",
};

const normalize = (title: string) => title.trim().toLowerCase();

export function taskFor(event: DevEvent): Task {
  const task = TASK_BANK[event.event_id];
  const meta = BANK_EVENTS[event.event_id];
  return task && meta && normalize(meta.title) === normalize(event.title) ? task : fallbackTask(event);
}

/** Задание приходит от компании, которая «снимает» башню профильного отдела. */
export function companyFor(event: DevEvent): Company {
  const meta = BANK_EVENTS[event.event_id];
  const department = meta && normalize(meta.title) === normalize(event.title)
    ? meta.department
    : event.target_roles.map(role => ROLE_DEPARTMENT[role]).find(Boolean) ?? "Human Resources";
  return { name: DEPARTMENT_COMPANY[department], about: `Башня отдела ${department} · практика по активности «${event.title}»` };
}

export function hintLimit(task: Task): number {
  return task.kind === "quiz" ? task.questions.length : task.hints.length;
}

/** 100 за первую попытку без подсказок; −10 за каждую повторную проверку и каждую подсказку; не ниже 50. */
export function scoreFor(attempts: number, hints: number): number {
  return Math.max(50, 100 - 10 * Math.max(0, attempts - 1) - 10 * Math.max(0, hints));
}

// ── Отображение значений ────────────────────────────────────────────────────

function literal(value: Json | unknown, kind: CodeTask["kind"]): string {
  if (value === null || value === undefined) return kind === "python" ? "None" : String(value);
  if (typeof value === "boolean") return kind === "python" ? (value ? "True" : "False") : String(value);
  if (typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => literal(item, kind)).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (kind === "python") return `{${entries.map(([k, v]) => `${JSON.stringify(k)}: ${literal(v, kind)}`).join(", ")}}`;
    if (!entries.length) return "{}";
    return `{ ${entries.map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${literal(v, kind)}`).join(", ")} }`;
  }
  return String(value);
}
const clip = (text: string, max = 180) => text.length > max ? `${text.slice(0, max - 1)}…` : text;
const callOf = (task: CodeTask, args: Json[]) => clip(`${task.functionName}(${args.map(arg => literal(arg, task.kind)).join(", ")})`);

// ── Публичная часть задания (уходит в клиент) ──────────────────────────────

export function publicTask(task: Task, event: DevEvent): PublicTask {
  const company = companyFor(event);
  if (task.kind === "quiz") {
    return {
      kind: "quiz", company, title: task.title, brief: task.brief, takeaway: task.takeaway,
      questions: task.questions.map(({ prompt, codeOptions, options, hint }) => ({ prompt, codeOptions: Boolean(codeOptions), options, hint })),
    };
  }
  return {
    kind: task.kind, company, title: task.title, brief: task.brief, takeaway: task.takeaway,
    fileName: task.kind === "python" ? "solution.py" : "solution.ts",
    example: task.example, starter: task.starter, hints: [...task.hints],
    tests: task.tests.map(test => ({ label: test.label, call: callOf(task, test.args) })),
  };
}

// ── Проверка ────────────────────────────────────────────────────────────────

export function sameJson(actual: unknown, expected: unknown): boolean {
  if (typeof actual === "number" && typeof expected === "number") return Math.abs(actual - expected) < 1e-9;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length && actual.every((item, i) => sameJson(item, expected[i]));
  }
  if (actual && expected && typeof actual === "object" && typeof expected === "object") {
    const a = actual as Record<string, unknown>; const b = expected as Record<string, unknown>;
    const keys = Object.keys(b);
    return Object.keys(a).length === keys.length && keys.every(key => Object.hasOwn(a, key) && sameJson(a[key], b[key]));
  }
  return actual === expected;
}

export function checkCode(task: CodeTask, code: string): CheckResult[] {
  const checks = task.tests.map((test): CheckResult & { error?: string } => {
    const call = callOf(task, test.args);
    try {
      let value: unknown;
      let mutated = false;
      if (task.kind === "python") value = runPython(code, task.functionName, test.args);
      else {
        const run = runTypeScript(code, task.functionName, test.args);
        value = run.value;
        mutated = Boolean(test.pure) && !sameJson(run.argsAfter, test.args);
      }
      if (mutated) return { label: test.label, passed: false, detail: `${call}: функция изменила входные данные. Верните новый объект, не меняя исходный.` };
      const passed = sameJson(value, test.expected);
      return {
        label: test.label, passed,
        detail: passed ? `${call} → ${clip(literal(value, task.kind))}` : `${call} → ${clip(literal(value, task.kind))}; ожидается ${clip(literal(test.expected, task.kind))}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Проверьте код.";
      return { label: test.label, passed: false, detail: `${call}: ${message}`, error: message };
    }
  });
  // Одна и та же ошибка во всех проверках (синтаксис, имя функции) — показываем её один раз.
  const first = checks[0]?.error;
  if (first && checks.every(check => check.error === first)) return [{ label: "Запуск кода", passed: false, detail: first }];
  return checks.map(({ label, passed, detail }) => ({ label, passed, detail }));
}

export function checkQuiz(task: QuizTask, answers: number[]): CheckResult[] {
  return task.questions.map((question, i) => {
    const passed = answers[i] === question.correct;
    return { label: `Ситуация ${i + 1}`, passed, detail: passed ? question.explanation : `Пока неверно. ${question.hint}` };
  });
}
