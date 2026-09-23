// Серверный store в памяти процесса. Данные из data/ грузятся лениво при первом обращении.
// Синглтон в globalThis, чтобы переживать HMR в dev.
import fs from "node:fs";
import path from "node:path";
import type {
  DevEvent,
  Employee,
  Grade,
  HistoryRecord,
  HistoryStatus,
  RoleProfile,
  Skill,
  SkillId,
} from "./types";

export const AS_OF = "2026-10-01";

interface Db {
  employees: Employee[];
  events: DevEvent[];
  skills: Skill[];
  proficiencyScale: Record<string, string>;
  roleProfiles: RoleProfile[];
  history: HistoryRecord[];
  seq: number;
}

const g = globalThis as typeof globalThis & { __cqStore?: Db };

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as T;
}

function load(): Db {
  const dir = path.join(process.cwd(), "data");
  const files = ["employees.json", "events.json", "skills.json", "activity_history.csv"];
  const missing = files.filter((f) => !fs.existsSync(path.join(dir, f)));
  if (missing.length) {
    throw new Error(`Нет данных в data/ (${missing.join(", ")}). Запусти: bash scripts/setup-data.sh`);
  }
  const { employees } = readJson<{ employees: Employee[] }>(dir, "employees.json");
  const { events } = readJson<{ events: DevEvent[] }>(dir, "events.json");
  const skillsFile = readJson<{
    proficiency_scale: Record<string, string>;
    skills: Skill[];
    role_profiles: RoleProfile[];
  }>(dir, "skills.json");
  const history = parseHistoryCsv(fs.readFileSync(path.join(dir, "activity_history.csv"), "utf8"));
  return {
    employees,
    events,
    skills: skillsFile.skills,
    proficiencyScale: skillsFile.proficiency_scale,
    roleProfiles: skillsFile.role_profiles,
    history,
    seq: maxRecordNumber(history),
  };
}

function db(): Db {
  g.__cqStore ??= load();
  return g.__cqStore;
}

// ── CSV ──────────────────────────────────────────────────────────────────────

/** Разбор CSV с поддержкой полей в кавычках ("a, b", "" внутри кавычек). */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

const numOrNull = (s: string | undefined) => (s === undefined || s.trim() === "" ? null : Number(s));

/** activity_history.csv → HistoryRecord[]. Экспортируется для загрузки файлов (upload). */
export function parseHistoryCsv(text: string): HistoryRecord[] {
  const [header, ...rows] = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (!header) return [];
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  return rows.map((r) => {
    const get = (k: string) => r[idx[k]]?.trim() ?? "";
    return {
      record_id: get("record_id"),
      employee_id: get("employee_id"),
      event_id: get("event_id"),
      date: get("date"),
      due_date: get("due_date") || null,
      status: get("status") as HistoryStatus,
      completion_pct: numOrNull(get("completion_pct")) ?? 0,
      score: numOrNull(get("score")),
      feedback_rating: numOrNull(get("feedback_rating")),
      assigned_by: (get("assigned_by") || "self") as HistoryRecord["assigned_by"],
    };
  });
}

function maxRecordNumber(history: HistoryRecord[]): number {
  return history.reduce((max, h) => {
    const n = Number(h.record_id.replace(/\D/g, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
}

function nextRecordId(): string {
  const d = db();
  d.seq += 1;
  return `R${String(d.seq).padStart(6, "0")}`;
}

// ── Чтение ───────────────────────────────────────────────────────────────────

export const getEmployees = (): Employee[] => db().employees;
export const getEmployee = (id: string): Employee | undefined => db().employees.find((e) => e.employee_id === id);

export const getEvents = (): DevEvent[] => db().events;
export const getEvent = (id: string): DevEvent | undefined => db().events.find((e) => e.event_id === id);

export const getSkills = (): Skill[] => db().skills;
export const getSkill = (id: SkillId): Skill | undefined => db().skills.find((s) => s.skill_id === id);
export const getProficiencyScale = (): Record<string, string> => db().proficiencyScale;

export const getRoleProfiles = (): RoleProfile[] => db().roleProfiles;
export const getRoleProfile = (role: string, grade: Grade): RoleProfile | undefined =>
  db().roleProfiles.find((p) => p.role === role && p.grade === grade);

/** История сотрудника по дате (старые → новые). */
export const getHistory = (employeeId: string): HistoryRecord[] =>
  db()
    .history.filter((h) => h.employee_id === employeeId)
    .sort((a, b) => a.date.localeCompare(b.date));

export const getAllHistory = (): HistoryRecord[] => db().history;

// ── Запись ───────────────────────────────────────────────────────────────────

export function addHistory(record: Omit<HistoryRecord, "record_id">): HistoryRecord {
  const full: HistoryRecord = { ...record, record_id: nextRecordId() };
  db().history.push(full);
  return full;
}

/** Добавляет новых сотрудников и заменяет существующих по employee_id. Возвращает число записанных. */
export function upsertEmployees(list: Employee[]): number {
  const employees = db().employees;
  for (const e of list) {
    const i = employees.findIndex((x) => x.employee_id === e.employee_id);
    if (i === -1) employees.push(e);
    else employees[i] = e;
  }
  return list.length;
}

/** Дописывает историю; записи без record_id или с занятым id получают новый id. */
export function appendHistory(list: HistoryRecord[]): number {
  const d = db();
  const ids = new Set(d.history.map((h) => h.record_id));
  d.seq = Math.max(d.seq, maxRecordNumber(list));
  for (const h of list) {
    const record = !h.record_id || ids.has(h.record_id) ? { ...h, record_id: nextRecordId() } : h;
    ids.add(record.record_id);
    d.history.push(record);
  }
  return list.length;
}
