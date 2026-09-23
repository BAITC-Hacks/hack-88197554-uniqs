import { randomBytes } from "node:crypto";
import { getEmployee, getEmployees } from "@/lib/store";
import type { Employee } from "@/lib/types";
import { hashPassword, hrState, loginAttempts, passwordMatches, publicAccount, saveHrState, sessions } from "./state";
import { ROLE_PERMISSIONS, type Account, type HrRole, type Permission } from "./types";

export class HrError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function json(value: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
export function route(action: (request: Request) => Promise<Response> | Response) {
  return async (request: Request) => {
    try {
      if (request.method !== "GET") {
        const origin = request.headers.get("origin");
        const host = request.headers.get("host") ?? new URL(request.url).host;
        if (origin && new URL(origin).host !== host) throw new HrError("Запрос с другого сайта запрещён", 403);
        if (request.headers.get("sec-fetch-site") === "cross-site") throw new HrError("Запрос с другого сайта запрещён", 403);
      }
      return await action(request);
    } catch (error) {
      if (error instanceof HrError) return json({ error: error.message }, error.status);
      if (error instanceof SyntaxError) return json({ error: "Некорректный JSON" }, 400);
      throw error;
    }
  };
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 50_000) throw new HrError("Слишком большой запрос", 413);
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HrError("Ожидается объект");
  return value as Record<string, unknown>;
}
export function string(value: unknown, label: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new HrError(`Проверьте поле «${label}»`);
  return value.trim();
}
function token(request: Request) {
  return request.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith("cq_hr_session="))?.slice("cq_hr_session=".length);
}
export function currentAccount(request: Request): Account {
  const key = token(request);
  const session = key ? sessions().get(key) : undefined;
  if (!session || session.expires <= Date.now()) {
    if (key) sessions().delete(key);
    throw new HrError("Войдите в HR-панель", 401);
  }
  const account = hrState().accounts.find((a) => a.id === session.accountId && a.enabled);
  if (!account) throw new HrError("Доступ отключён", 401);
  return publicAccount(account);
}
export function requirePermission(account: Account, permission: Permission) {
  if (!account.permissions[permission]) throw new HrError("Недостаточно прав для этого действия", 403);
}
export function inScope(account: Account, employee: Employee) {
  if (account.role === "employee") return account.employeeId === employee.employee_id;
  if (account.role === "admin") return true;
  return account.departments.includes(employee.department);
}
export function scopedEmployee(account: Account, id: string) {
  const employee = getEmployee(id);
  if (!employee || !inScope(account, employee)) throw new HrError("Сотрудник недоступен", 404);
  return employee;
}
function cookie(request: Request, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  return `cq_hr_session=${value}; Path=/api/hr; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
export const sessionGet = route((request) => { hrState(); return json({ account: currentAccount(request) }); });
export const sessionPost = route(async (request) => {
  const data = await body(request);
  const login = string(data.login, "Логин", 80).toLowerCase();
  const password = string(data.password, "Пароль", 256);
  const attempt = loginAttempts().get(login);
  if (attempt && attempt.until > Date.now() && attempt.count >= 8) throw new HrError("Слишком много попыток. Повторите через 15 минут.", 429);
  const account = hrState().accounts.find((a) => a.login === login && a.enabled);
  if (!account || !passwordMatches(password, account.passwordHash)) {
    loginAttempts().set(login, { count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1, until: Date.now() + 900_000 });
    throw new HrError("Неверный логин или пароль", 401);
  }
  loginAttempts().delete(login);
  const previous = token(request);
  if (previous) sessions().delete(previous);
  const key = randomBytes(32).toString("hex");
  sessions().set(key, { accountId: account.id, expires: Date.now() + 8 * 3600_000 });
  return json({ account: publicAccount(account) }, 200, { "Set-Cookie": cookie(request, key, 8 * 3600) });
});
export const sessionDelete = route((request) => {
  const key = token(request);
  if (key) sessions().delete(key);
  return json({ ok: true }, 200, { "Set-Cookie": cookie(request, "", 0) });
});
export const accessPost = route(async (request) => {
  const actor = currentAccount(request);
  requirePermission(actor, "access");
  const data = await body(request);
  const state = hrState();
  const existing = typeof data.id === "string" ? state.accounts.find((a) => a.id === data.id) : undefined;
  if (data.id && !existing) throw new HrError("Учётная запись не найдена", 404);
  const login = string(data.login, "Логин", 80).toLowerCase();
  if (!/^[a-z0-9._-]{3,80}$/.test(login)) throw new HrError("Логин: от 3 символов, латиница, цифры, точка, дефис");
  if (state.accounts.some((a) => a.login === login && a.id !== existing?.id)) throw new HrError("Логин уже занят", 409);
  const role = string(data.role, "Роль") as HrRole;
  if (!Object.hasOwn(ROLE_PERMISSIONS, role)) throw new HrError("Неизвестная роль");
  const name = string(data.name, "Имя");
  const employeeId = typeof data.employeeId === "string" && data.employeeId ? data.employeeId : null;
  if (employeeId && !getEmployee(employeeId)) throw new HrError("Сотрудник не найден");
  if (role === "employee" && !employeeId) throw new HrError("Привяжите аккаунт к сотруднику");
  const departments = getEmployees().map((e) => e.department).filter((d, i, all) => all.indexOf(d) === i);
  if (!Array.isArray(data.departments) || data.departments.some((d) => !departments.includes(d))) throw new HrError("Некорректные отделы");
  const scope = data.departments as Account["departments"];
  if ((role === "hr" || role === "manager") && !scope.length) throw new HrError("Выберите хотя бы один доступный отдел");
  const permissions = { ...ROLE_PERMISSIONS[role] };
  if (role !== "admin" && role !== "employee") {
    const input = data.permissions;
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new HrError("Укажите разрешения");
    for (const p of ["overview", "profiles", "plans"] as const) permissions[p] = (input as Record<string, unknown>)[p] === true;
    if (permissions.plans && !permissions.profiles) throw new HrError("Для планов нужен доступ к карточкам сотрудников");
  }
  const enabled = data.enabled !== false;
  if (existing?.id === actor.id && (role !== "admin" || !enabled)) throw new HrError("Нельзя отключить или понизить собственный административный доступ");
  const password = typeof data.password === "string" ? data.password : "";
  if ((!existing || password) && (password.length < 10 || password.length > 256 || password.trim() !== password)) throw new HrError("Пароль: 10–256 символов без пробелов по краям");
  const account = { id: existing?.id ?? randomBytes(12).toString("hex"), login, name, role, employeeId, departments: role === "admin" ? [] : scope, permissions, enabled, passwordHash: password ? hashPassword(password) : existing!.passwordHash };
  if (existing) state.accounts[state.accounts.indexOf(existing)] = account;
  else state.accounts.push(account);
  saveHrState();
  if (existing && password) for (const [key, session] of sessions()) if (session.accountId === existing.id) sessions().delete(key);
  return json({ account: publicAccount(account) });
});
