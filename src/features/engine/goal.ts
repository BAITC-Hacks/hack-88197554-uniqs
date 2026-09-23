// Цель сотрудника «Кем я хочу стать». Меняет career_goal в in-memory store, дальше targetFor,
// gaps и recommend подхватывают её сами. Тонкий реэкспорт: src/app/api/goal/route.ts.
import { getEmployee, getRoleProfile, getRoleProfiles, upsertEmployees } from "@/lib/store";
import { GRADES, type Employee, type Grade } from "@/lib/types";
import { getProfile } from "./profile";

export type CareerGoal = Employee["career_goal"];

/** GET /api/goal?employeeId= */
export interface GoalOptions {
  /** career_goal из исходного профиля, до правок в лобби */
  original: CareerGoal;
  current: CareerGoal;
  roles: { role: string; grade: Grade }[];
}

// Исходная цель запоминается до первой правки; globalThis, чтобы переживать HMR в dev.
const g = globalThis as typeof globalThis & { __cqGoalOrigin?: Map<string, CareerGoal> };
const origin = (g.__cqGoalOrigin ??= new Map<string, CareerGoal>());

const bad = (error: string, status = 400) => Response.json({ error }, { status });

function validate(employee: Employee, goal: CareerGoal): string | null {
  if (!goal) return null;
  if (!GRADES.includes(goal.target_grade)) return `Неизвестный грейд ${goal.target_grade}`;
  if (!getRoleProfile(goal.target_role, goal.target_grade)) return `Нет профиля роли ${goal.target_role} · ${goal.target_grade}`;
  if (GRADES.indexOf(goal.target_grade) < GRADES.indexOf(employee.grade)) return "Грейд цели ниже текущего";
  if (goal.target_role === employee.role && goal.target_grade === employee.grade) return "Цель совпадает с текущей ролью и грейдом";
  return null;
}

export function setGoal(employee: Employee, goal: CareerGoal) {
  if (!origin.has(employee.employee_id)) origin.set(employee.employee_id, employee.career_goal);
  upsertEmployees([{ ...employee, career_goal: goal }]);
  return getProfile(employee.employee_id);
}

export async function getGoalRoute(req: Request) {
  const id = new URL(req.url).searchParams.get("employeeId") ?? "";
  const employee = getEmployee(id);
  if (!employee) return bad(`Сотрудник ${id} не найден`, 404);
  const options: GoalOptions = {
    original: origin.has(id) ? (origin.get(id) ?? null) : employee.career_goal,
    current: employee.career_goal,
    roles: getRoleProfiles().map(({ role, grade }) => ({ role, grade })),
  };
  return Response.json(options);
}

export async function postGoalRoute(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.employeeId !== "string") {
    return bad("Ожидается { employeeId, target_role, target_grade } или { employeeId, goal: null }");
  }
  const employee = getEmployee(body.employeeId);
  if (!employee) return bad(`Сотрудник ${body.employeeId} не найден`, 404);
  let goal: CareerGoal = null;
  if (!("goal" in body && body.goal === null)) {
    if (typeof body.target_role !== "string" || typeof body.target_grade !== "string") {
      return bad("Нужны target_role и target_grade или goal: null");
    }
    goal = { target_role: body.target_role, target_grade: body.target_grade as Grade };
  }
  const error = validate(employee, goal);
  if (error) return bad(error);
  return Response.json(setGoal(employee, goal));
}
