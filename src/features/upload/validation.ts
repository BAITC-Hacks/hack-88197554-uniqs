import {
  AS_OF, getAllHistory, getEmployees, getEvents, getProficiencyScale,
  getRoleProfiles, getSkills, parseHistoryCsv,
} from "@/lib/store";
import { GRADES, type Employee, type HistoryRecord } from "@/lib/types";

export class UploadError extends Error {}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new UploadError(message);
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, field: string): asserts value is string {
  requireValue(typeof value === "string" && value.trim().length > 0 && value === value.trim(),
    `${field}: нужна непустая строка без пробелов по краям.`);
}

function number(value: unknown, field: string, min: number, max: number) {
  requireValue(typeof value === "number" && Number.isFinite(value) && value >= min && value <= max,
    `${field}: ожидается число от ${min} до ${max}.`);
}

function oneOf(value: unknown, values: readonly string[], field: string) {
  requireValue(typeof value === "string" && values.includes(value),
    `${field}: допустимы ${values.join(", ")}.`);
}

function date(value: unknown, field: string): asserts value is string {
  requireValue(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
    `${field}: нужна дата YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  requireValue(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value,
    `${field}: такой календарной даты не существует.`);
}

export function parseEmployees(source: string): Employee[] {
  let data: unknown;
  try {
    data = JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch {
    throw new UploadError("employees.json: некорректный JSON.");
  }
  requireValue(object(data) && Array.isArray(data.employees),
    'employees.json: ожидается объект с массивом employees: {"employees": [...]} .');
  const roles = getRoleProfiles();
  const skills = new Set(getSkills().map((skill) => skill.skill_id));
  const levels = Object.keys(getProficiencyScale()).map(Number);
  const departments = ["Backend Development", "Frontend Development", "Data & Analytics",
    "Quality Assurance", "Product Management", "Human Resources", "Sales", "Customer Support"];
  const ids = new Set<string>();
  for (const [index, entry] of data.employees.entries()) {
    const prefix = `employees.json, сотрудник ${index + 1}`;
    requireValue(object(entry), `${prefix}: ожидается объект.`);
    for (const field of ["employee_id", "full_name", "role"] as const) text(entry[field], `${prefix}, ${field}`);
    const id = entry.employee_id as string;
    requireValue(!ids.has(id), `${prefix}: employee_id ${id} повторяется в файле.`);
    ids.add(id);
    oneOf(entry.department, departments, `${prefix}, department`);
    oneOf(entry.grade, GRADES, `${prefix}, grade`);
    requireValue(roles.some((role) => role.role === entry.role && role.grade === entry.grade),
      `${prefix}: нет профиля роли ${entry.role} / ${entry.grade}.`);
    oneOf(entry.work_format, ["office", "hybrid", "remote"], `${prefix}, work_format`);
    oneOf(entry.preferred_language, ["kk", "ru", "en"], `${prefix}, preferred_language`);
    number(entry.tenure_months, `${prefix}, tenure_months`, 0, Number.MAX_SAFE_INTEGER);
    requireValue(Number.isInteger(entry.tenure_months), `${prefix}, tenure_months: нужно целое число.`);
    const hireDate = entry.hire_date;
    const reviewDate = entry.last_review_date;
    date(hireDate, `${prefix}, hire_date`);
    date(reviewDate, `${prefix}, last_review_date`);
    requireValue(hireDate <= AS_OF && reviewDate <= AS_OF, `${prefix}: дата позже ${AS_OF}.`);
    requireValue(reviewDate >= hireDate,
      `${prefix}: last_review_date раньше hire_date.`);
    if (entry.manager_id !== null) text(entry.manager_id, `${prefix}, manager_id`);
    if (entry.career_goal !== null) {
      requireValue(object(entry.career_goal), `${prefix}, career_goal: нужен объект или null.`);
      const goal = entry.career_goal;
      text(goal.target_role, `${prefix}, career_goal.target_role`);
      oneOf(goal.target_grade, GRADES, `${prefix}, career_goal.target_grade`);
      requireValue(roles.some((role) => role.role === goal.target_role && role.grade === goal.target_grade),
        `${prefix}: неизвестная целевая роль или грейд.`);
    }
    requireValue(object(entry.skills) && Object.keys(entry.skills).length > 0,
      `${prefix}, skills: нужен непустой объект навыков.`);
    for (const [id, level] of Object.entries(entry.skills)) {
      requireValue(skills.has(id), `${prefix}, skills: неизвестный навык ${id}.`);
      number(level, `${prefix}, skills.${id}`, Math.min(...levels), Math.max(...levels));
    }
  }
  const employees = data.employees as Employee[];
  const knownIds = new Set([...getEmployees().map((employee) => employee.employee_id), ...ids]);
  for (const employee of employees) {
    requireValue(employee.manager_id === null ||
      (knownIds.has(employee.manager_id) && employee.manager_id !== employee.employee_id),
    `employees.json, ${employee.employee_id}: manager_id должен ссылаться на другого существующего или загружаемого сотрудника.`);
  }
  return employees;
}

const HISTORY_COLUMNS = ["record_id", "employee_id", "event_id", "date", "due_date", "status",
  "completion_pct", "score", "feedback_rating", "assigned_by"];

// Shared parser намеренно допускает пропуски и незакрытые кавычки.
// Здесь проверяется структура CSV; преобразование в HistoryRecord делает parseHistoryCsv.
function validateCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  const finishField = () => { row.push(field); field = ""; state = "start"; };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (state === "quoted") {
      if (ch === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') state = "closed";
      else field += ch;
    } else if (ch === ",") finishField();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      finishRow();
    } else if (ch === '"' && state === "start") state = "quoted";
    else {
      requireValue(state !== "closed" && ch !== '"',
        `activity_history.csv, запись ${rows.length + 1}: некорректные кавычки.`);
      field += ch;
      state = "plain";
    }
  }
  requireValue(state !== "quoted", "activity_history.csv: незакрытые кавычки.");
  finishRow();
  const header = rows.shift()?.map((column) => column.trim());
  requireValue(header && header.length === HISTORY_COLUMNS.length && new Set(header).size === header.length &&
    HISTORY_COLUMNS.every((column) => header.includes(column)),
  `activity_history.csv: нужны столбцы ${HISTORY_COLUMNS.join(", ")}.`);
  for (const [index, cells] of rows.entries()) {
    const prefix = `activity_history.csv, запись ${index + 1}`;
    requireValue(cells.length === header.length, `${prefix}: число полей не совпадает с заголовком.`);
    for (const column of HISTORY_COLUMNS.filter((name) => !["due_date", "score", "feedback_rating"].includes(name))) {
      requireValue(cells[header.indexOf(column)].trim() !== "", `${prefix}: поле ${column} не заполнено.`);
    }
    for (const column of ["completion_pct", "score", "feedback_rating"]) {
      const value = cells[header.indexOf(column)].trim();
      requireValue(!value || /^\d+(\.\d+)?$/.test(value), `${prefix}, ${column}: ожидается число.`);
    }
  }
}

export function parseHistory(source: string, employees: Employee[]): HistoryRecord[] {
  source = source.replace(/^\uFEFF/, "");
  validateCsv(source);
  const records = parseHistoryCsv(source);
  const employeeIds = new Set([...getEmployees(), ...employees].map((employee) => employee.employee_id));
  const eventIds = new Set(getEvents().map((event) => event.event_id));
  for (const [index, record] of records.entries()) {
    const prefix = `activity_history.csv, запись ${index + 1} (${record.record_id})`;
    requireValue(employeeIds.has(record.employee_id), `${prefix}: неизвестный employee_id ${record.employee_id}.`);
    requireValue(eventIds.has(record.event_id), `${prefix}: неизвестный event_id ${record.event_id}.`);
    date(record.date, `${prefix}, date`);
    if (record.due_date !== null) date(record.due_date, `${prefix}, due_date`);
    oneOf(record.status, ["completed", "in_progress", "dropped", "no_show", "declined", "overdue"], `${prefix}, status`);
    oneOf(record.assigned_by, ["self", "manager", "hr"], `${prefix}, assigned_by`);
    number(record.completion_pct, `${prefix}, completion_pct`, 0, 100);
    if (record.score !== null) number(record.score, `${prefix}, score`, 0, 100);
    if (record.feedback_rating !== null) number(record.feedback_rating, `${prefix}, feedback_rating`, 1, 5);
  }
  return records;
}

function historyKey(record: HistoryRecord): string {
  return JSON.stringify([record.employee_id, record.event_id, record.date, record.due_date,
    record.status, record.completion_pct, record.score, record.feedback_rating, record.assigned_by]);
}

export function newHistory(records: HistoryRecord[]): HistoryRecord[] {
  const existing = getAllHistory();
  const ids = new Map(existing.map((record) => [record.record_id, historyKey(record)]));
  const contents = new Set(existing.map(historyKey));
  const fresh: HistoryRecord[] = [];
  for (const record of records) {
    const key = historyKey(record);
    requireValue(!ids.has(record.record_id) || ids.get(record.record_id) === key,
      `activity_history.csv: record_id ${record.record_id} уже занят другой записью.`);
    ids.set(record.record_id, key);
    if (contents.has(key)) continue;
    contents.add(key);
    fresh.push(record);
  }
  return fresh;
}
