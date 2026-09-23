// Банк заданий по event_id + проверка решений. Только сервер: здесь эталоны и правильные ответы.
import type { DevEvent } from "@/lib/types";
import type { CheckResult, PublicTask } from "../exercises";
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

/** Для какой активности написано задание: если жюри загрузит другое событие с тем же id, берём нейтральный кейс. */
export const BANK_EVENT_TITLES: Record<string, string> = {
  EV_005: "System Design Fundamentals", EV_006: "Designing High-Load Systems", EV_007: "Architecture Review Circle",
  EV_008: "Business Writing & Documentation", EV_009: "Cloud Certification Prep", EV_010: "Kubernetes in Practice",
  EV_011: "Secure Coding Workshop", EV_012: "Advanced Python", EV_013: "TypeScript in Depth",
  EV_014: "Web Performance Deep Dive", EV_015: "Web Performance Fundamentals", EV_016: "Accessible Interfaces",
  EV_017: "React Patterns & State Management", EV_018: "Test Automation Bootcamp", EV_019: "API & Performance Testing Workshop",
  EV_020: "Applied Statistics for Analysts", EV_021: "A/B Testing Workshop", EV_022: "SQL & BI for Analytics",
  EV_023: "Data Storytelling & Visualization", EV_024: "Machine Learning for Analysts", EV_025: "Dimensional Data Modeling",
  EV_026: "Product Discovery Lab", EV_027: "Roadmapping & Agile Planning", EV_028: "Labor Law & Employee Relations",
  EV_029: "People Analytics & Total Rewards", EV_030: "Structured Interviewing", EV_031: "Designing Learning Programs",
  EV_032: "Negotiation Masterclass", EV_033: "Consultative Selling & Prospecting", EV_034: "Handling Difficult Conversations",
  EV_035: "Technical Troubleshooting Academy", EV_036: "Public Speaking Club", EV_037: "Mentor Track",
  EV_038: "Leadership Foundations", EV_039: "Time & Priority Management", EV_040: "Structured Problem Solving",
};

const normalize = (title: string) => title.trim().toLowerCase();

export function taskFor(event: DevEvent): Task {
  const task = TASK_BANK[event.event_id];
  const title = BANK_EVENT_TITLES[event.event_id];
  return task && title && normalize(title) === normalize(event.title) ? task : fallbackTask(event);
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

export function publicTask(task: Task): PublicTask {
  if (task.kind === "quiz") {
    return {
      kind: "quiz", title: task.title, brief: task.brief, takeaway: task.takeaway,
      questions: task.questions.map(({ prompt, codeOptions, options, hint }) => ({ prompt, codeOptions: Boolean(codeOptions), options, hint })),
    };
  }
  return {
    kind: task.kind, title: task.title, brief: task.brief, takeaway: task.takeaway,
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
