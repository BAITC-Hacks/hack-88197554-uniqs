import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ROLE_PERMISSIONS, type Account, type LearningPlan } from "./types";

export interface StoredAccount extends Account { passwordHash: string; }
interface HrState { accounts: StoredAccount[]; plans: LearningPlan[]; }
interface Session { accountId: string; expires: number; }
const runtime = globalThis as typeof globalThis & { __cqHrState?: HrState; __cqHrSessions?: Map<string, Session>; __cqHrAttempts?: Map<string, { count: number; until: number }> };
const dir = () => path.join(process.cwd(), "src", "features", "hr", ".local");

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function passwordMatches(password: string, hash: string): boolean {
  const [salt, value] = hash.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(value, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function hrState(): HrState {
  if (runtime.__cqHrState) return runtime.__cqHrState;
  fs.mkdirSync(dir(), { recursive: true });
  const file = path.join(dir(), "workspace.json");
  if (fs.existsSync(file)) runtime.__cqHrState = JSON.parse(fs.readFileSync(file, "utf8")) as HrState;
  else {
    const password = randomBytes(18).toString("base64url");
    runtime.__cqHrState = { plans: [], accounts: [{
      id: "hr-admin", login: "admin", name: "Администратор HR", role: "admin", employeeId: null,
      departments: [], permissions: { ...ROLE_PERMISSIONS.admin }, enabled: true, passwordHash: hashPassword(password),
    }] };
    fs.writeFileSync(path.join(dir(), "admin-access.txt"), `Career Quest — HR\nLogin: admin\nPassword: ${password}\nURL: /hr\n`, { mode: 0o600 });
    saveHrState();
  }
  return runtime.__cqHrState;
}
export function saveHrState() {
  const file = path.join(dir(), "workspace.json");
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(runtime.__cqHrState, null, 2), { mode: 0o600 });
  fs.renameSync(`${file}.tmp`, file);
}
export const sessions = () => runtime.__cqHrSessions ??= new Map<string, Session>();
export const loginAttempts = () => runtime.__cqHrAttempts ??= new Map<string, { count: number; until: number }>();
export function publicAccount(account: StoredAccount): Account {
  return { id: account.id, login: account.login, name: account.name, role: account.role, employeeId: account.employeeId, departments: account.departments, permissions: account.permissions, enabled: account.enabled };
}
