import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ROLE_PERMISSIONS, type Account, type LearningPlan } from "./types";
import { HR_DEMO_ACCESS } from "./demo-access";

export interface StoredAccount extends Account { passwordHash: string; }
interface HrState { accounts: StoredAccount[]; plans: LearningPlan[]; demoAccessVersion?: number; }
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
  if (runtime.__cqHrState) {
    migrateDemoAccess();
    return runtime.__cqHrState;
  }
  fs.mkdirSync(dir(), { recursive: true });
  const file = path.join(dir(), "workspace.json");
  if (fs.existsSync(file)) runtime.__cqHrState = JSON.parse(fs.readFileSync(file, "utf8")) as HrState;
  else {
    runtime.__cqHrState = { plans: [], accounts: [{
      id: "hr-admin", login: HR_DEMO_ACCESS.login, name: "Администратор HR", role: "admin", employeeId: null,
      departments: [], permissions: { ...ROLE_PERMISSIONS.admin }, enabled: true, passwordHash: hashPassword(HR_DEMO_ACCESS.password),
    }] };
  }
  migrateDemoAccess();
  return runtime.__cqHrState;
}

/** Update the existing demo account once, including a store already cached during HMR. */
function migrateDemoAccess() {
  const state = runtime.__cqHrState;
  if (!state || state.demoAccessVersion === 2) return;
  const admin = state.accounts.find(account => account.id === "hr-admin" && account.login === HR_DEMO_ACCESS.login);
  if (admin) {
    admin.passwordHash = hashPassword(HR_DEMO_ACCESS.password);
    for (const [key, session] of sessions()) if (session.accountId === admin.id) sessions().delete(key);
    loginAttempts().delete(admin.login);
    fs.writeFileSync(path.join(dir(), "admin-access.txt"), `Career Quest — HR\nLogin: ${HR_DEMO_ACCESS.login}\nPassword: ${HR_DEMO_ACCESS.password}\nURL: /hr\n`, { mode: 0o600 });
  }
  state.demoAccessVersion = 2;
  saveHrState();
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
