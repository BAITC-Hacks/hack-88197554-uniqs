import { AS_OF, getEmployees, getEvents, getRoleProfiles, getSkills } from "@/lib/store";
import { GRADES, type Department, type Employee, type HistoryRecord } from "@/lib/types";
import { ImportError } from "./types";

type ObjectValue = Record<string, unknown>;
const DEPARTMENTS: Department[] = ["Backend Development", "Frontend Development", "Data & Analytics", "Quality Assurance", "Product Management", "Human Resources", "Sales", "Customer Support"];
const HISTORY_COLUMNS = ["record_id", "employee_id", "event_id", "date", "due_date", "status", "completion_pct", "score", "feedback_rating", "assigned_by"] as const;

function fail(where: string, message: string): never { throw new ImportError(`${where}: ${message}`); }
function object(value: unknown, where: string): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(where, "ожидается объект.");
  return value as ObjectValue;
}
function text(value: unknown, where: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 300) fail(where, "нужна непустая строка длиной до 300 символов.");
  return value.trim();
}
function number(value: unknown, min: number, max: number, where: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) fail(where, `нужно целое число от ${min} до ${max}.`);
  return value;
}
function oneOf<T extends string>(value: unknown, values: readonly T[], where: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) fail(where, `допустимые значения: ${values.join(", ")}.`);
  return value as T;
}
function date(value: unknown, where: string): string {
  const result = text(value, where);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) fail(where, "нужна существующая дата YYYY-MM-DD.");
  return result;
}

/** Dataset wrapper or an array of complete employee profiles. Unknown fields are not stored. */
export function parseEmployees(source: string): Employee[] {
  let parsed: unknown;
  try { parsed = JSON.parse(source.replace(/^\uFEFF/, "")); }
  catch { throw new ImportError("employees.json: некорректный JSON. Проверьте кавычки и запятые."); }
  const list = Array.isArray(parsed) ? parsed : object(parsed, "employees.json").employees;
  if (!Array.isArray(list) || !list.length) fail("employees.json", "ожидается непустой массив employees или массив профилей.");
  if (list.length > 5000) fail("employees.json", "не более 5000 профилей за одну загрузку.");
  const catalog = new Set(getSkills().map(s => s.skill_id));
  const roles = new Set(getRoleProfiles().map(r => `${r.role}:${r.grade}`));
  const ids = new Set<string>();
  const employees = list.map((value, index): Employee => {
    const where = `employees.json, профиль ${index + 1}`;
    const item = object(value, where);
    const employee_id = text(item.employee_id, `${where}, employee_id`);
    if (ids.has(employee_id)) fail(where, `повторяется employee_id ${employee_id}.`);
    ids.add(employee_id);
    const role = text(item.role, `${where}, role`);
    const grade = oneOf(item.grade, GRADES, `${where}, grade`);
    if (!roles.has(`${role}:${grade}`)) fail(where, `нет требований для роли ${role} и грейда ${grade}.`);
    const rawSkills = object(item.skills, `${where}, skills`);
    const skills = Object.fromEntries(Object.entries(rawSkills).map(([id, level]) => {
      if (!catalog.has(id)) fail(where, `неизвестный навык ${id}.`);
      return [id, number(level, 0, 5, `${where}, skills.${id}`)];
    }));
    let career_goal: Employee["career_goal"] = null;
    if (item.career_goal !== null) {
      const goal = object(item.career_goal, `${where}, career_goal (или null)`);
      const target_role = text(goal.target_role, `${where}, career_goal.target_role`);
      const target_grade = oneOf(goal.target_grade, GRADES, `${where}, career_goal.target_grade`);
      if (!roles.has(`${target_role}:${target_grade}`)) fail(where, "целевая роль и грейд отсутствуют в каталоге требований.");
      career_goal = { target_role, target_grade };
    }
    const hire_date = date(item.hire_date, `${where}, hire_date`);
    const last_review_date = date(item.last_review_date, `${where}, last_review_date`);
    if (hire_date > AS_OF || last_review_date > AS_OF) fail(where, `дата найма и ревью не могут быть позже даты среза ${AS_OF}.`);
    return {
      employee_id, full_name: text(item.full_name, `${where}, full_name`),
      department: oneOf(item.department, DEPARTMENTS, `${where}, department`), role, grade,
      manager_id: item.manager_id === null ? null : text(item.manager_id, `${where}, manager_id (или null)`),
      hire_date, last_review_date, tenure_months: number(item.tenure_months, 0, 1200, `${where}, tenure_months`),
      work_format: oneOf(item.work_format, ["office", "hybrid", "remote"], `${where}, work_format`),
      preferred_language: oneOf(item.preferred_language, ["kk", "ru", "en"], `${where}, preferred_language`),
      career_goal, skills,
    };
  });
  const known = new Set([...getEmployees().map(e => e.employee_id), ...ids]);
  for (const employee of employees) {
    if (employee.manager_id && !known.has(employee.manager_id)) fail(`employees.json, ${employee.employee_id}`, `руководитель ${employee.manager_id} не найден. Загрузите его профиль вместе с сотрудником или укажите null.`);
    if (employee.manager_id === employee.employee_id) fail(`employees.json, ${employee.employee_id}`, "сотрудник не может быть своим руководителем.");
  }
  return employees;
}

/** Strict CSV quoting and column counts, including BOM, CRLF, commas and escaped quotes. */
function csvRows(source: string): { fields: string[]; line: number }[] {
  const rows: { fields: string[]; line: number }[] = [];
  const input = source.replace(/^\uFEFF/, "");
  let fields: string[] = [], field = "", quoted = false, closed = false, line = 1, start = 1;
  const pushField = () => { fields.push(field); field = ""; closed = false; };
  const pushRow = () => {
    pushField();
    if (fields.some(f => f.trim() !== "")) rows.push({ fields, line: start });
    fields = [];
  };
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else { field += char; if (char === "\n") line++; }
    } else if (char === '"') {
      if (field || closed) fail(`activity_history.csv, строка ${line}`, "кавычка допустима только в начале поля.");
      quoted = true;
    } else if (char === ",") pushField();
    else if (char === "\r" || char === "\n") {
      pushRow();
      if (char === "\r" && input[i + 1] === "\n") i++;
      start = ++line;
    } else {
      if (closed) fail(`activity_history.csv, строка ${line}`, "после закрывающей кавычки нужна запятая или конец строки.");
      field += char;
    }
  }
  if (quoted) fail(`activity_history.csv, строка ${start}`, "не закрыты кавычки.");
  pushRow();
  return rows;
}

export function parseHistory(source: string, importedEmployees: Employee[]): HistoryRecord[] {
  const [first, ...rows] = csvRows(source);
  if (!first) fail("activity_history.csv", "файл пуст.");
  const header = first.fields.map(v => v.trim());
  if (new Set(header).size !== header.length) fail("activity_history.csv", "заголовки столбцов повторяются.");
  const missing = HISTORY_COLUMNS.filter(column => !header.includes(column));
  if (missing.length) fail("activity_history.csv", `не хватает столбцов: ${missing.join(", ")}. Разделитель — запятая.`);
  if (!rows.length) fail("activity_history.csv", "нет записей истории после заголовка.");
  if (rows.length > 50000) fail("activity_history.csv", "не более 50000 записей за одну загрузку.");
  const employees = new Set([...getEmployees(), ...importedEmployees].map(e => e.employee_id));
  const events = new Set(getEvents().map(e => e.event_id));
  const ids = new Map<string, string>();
  return rows.map(({ fields, line }) => {
    const where = `activity_history.csv, строка ${line}`;
    if (fields.length !== header.length) fail(where, `ожидалось ${header.length} столбцов, получено ${fields.length}.`);
    const row = Object.fromEntries(header.map((key, i) => [key, fields[i].trim()]));
    const employee_id = text(row.employee_id, `${where}, employee_id`);
    const event_id = text(row.event_id, `${where}, event_id`);
    if (!employees.has(employee_id)) fail(where, `сотрудник ${employee_id} не найден. Добавьте его employees.json в эту загрузку.`);
    if (!events.has(event_id)) fail(where, `неизвестная активность ${event_id}.`);
    const record_id = text(row.record_id, `${where}, record_id`);
    const status = oneOf(row.status, ["completed", "in_progress", "dropped", "no_show", "declined", "overdue"], `${where}, status`);
    const numeric = (key: string, min: number, max: number, nullable = false) => {
      if (row[key] === "" && nullable) return null;
      if (!/^\d+$/.test(row[key])) fail(`${where}, ${key}`, "ожидается целое число.");
      return number(Number(row[key]), min, max, `${where}, ${key}`);
    };
    const completion_pct = numeric("completion_pct", 0, 100)!;
    if (status === "completed" && completion_pct !== 100) fail(where, "у completed поле completion_pct должно быть 100.");
    const record: HistoryRecord = {
      record_id, employee_id, event_id, status, completion_pct,
      date: date(row.date, `${where}, date`), due_date: row.due_date ? date(row.due_date, `${where}, due_date`) : null,
      score: numeric("score", 0, 100, true), feedback_rating: numeric("feedback_rating", 1, 5, true),
      assigned_by: oneOf(row.assigned_by, ["self", "manager", "hr"], `${where}, assigned_by`),
    };
    if (record.date > AS_OF) fail(where, `дата участия не может быть позже даты среза ${AS_OF}.`);
    const fingerprint = historyKey(record);
    if (ids.has(record_id) && ids.get(record_id) !== fingerprint) fail(where, `record_id ${record_id} повторяется с разными данными.`);
    ids.set(record_id, fingerprint);
    return record;
  });
}

/** Importing an unchanged row again must not duplicate learning history. */
export function historyKey(record: HistoryRecord): string {
  return JSON.stringify([record.employee_id, record.event_id, record.date, record.due_date, record.status, record.completion_pct, record.score, record.feedback_rating, record.assigned_by]);
}
