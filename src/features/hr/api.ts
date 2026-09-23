import { randomUUID } from "node:crypto";
import { AS_OF, getEmployees, getEvents, getHistory, getSkills } from "@/lib/store";
import { GRADES } from "@/lib/types";
import { body, currentAccount, HrError, inScope, json, requirePermission, route, scopedEmployee, string } from "./access";
import { candidatesFor, employeeView, skillOverview } from "./competencies";
import { hrState, publicAccount, saveHrState } from "./state";
import type { Account, HrWorkspace, LearningPlan, PlanStep, PlanView } from "./types";

function visiblePlans(account: Account): LearningPlan[] {
  const visible = new Set(getEmployees().filter((e) => inScope(account, e)).map((e) => e.employee_id));
  if (account.role !== "employee" && !account.permissions.profiles) return [];
  return hrState().plans.filter((p) => visible.has(p.employeeId) && (account.role !== "employee" || p.state === "published"));
}
function planView(plan: LearningPlan): PlanView {
  const employee = getEmployees().find((e) => e.employee_id === plan.employeeId)!;
  const baseline = new Set(plan.baselineHistoryIds ?? []);
  const completed = new Set(getHistory(plan.employeeId).filter((h) => h.status === "completed" && h.date >= AS_OF && !baseline.has(h.record_id)).map((h) => h.event_id));
  const events = getEvents();
  return { ...plan, employeeName: employee.full_name, department: employee.department, completedEventIds: plan.steps.filter((s) => s.kind === "task" ? !!s.doneAt : completed.has(s.eventId)).map((s) => s.eventId), totalHours: plan.steps.reduce((sum, s) => sum + (s.kind === "task" ? s.hours ?? 0 : events.find((e) => e.event_id === s.eventId)?.duration_hours ?? 0), 0) };
}
export const getHrRoute = route((request) => {
  const account = currentAccount(request);
  const params = new URL(request.url).searchParams;
  const department = params.get("department");
  const grade = params.get("grade");
  if (grade && !GRADES.includes(grade as typeof GRADES[number])) throw new HrError("Неизвестный грейд");
  const scope = getEmployees().filter((e) => inScope(account, e));
  const departments = [...new Set(scope.map((e) => e.department))].sort();
  if (department && !departments.some((d) => d === department)) throw new HrError("Отдел недоступен", 403);
  const query = (params.get("q") ?? "").trim().toLowerCase();
  if (query && !account.permissions.profiles && account.role !== "employee") throw new HrError("Для поиска сотрудников нужен доступ к карточкам", 403);
  const employees = scope.filter((e) => (!department || e.department === department) && (!grade || e.grade === grade) && (!query || `${e.full_name} ${e.employee_id} ${e.role}`.toLowerCase().includes(query))).map(employeeView);
  const employeeIds = new Set(employees.map((e) => e.id));
  const plans = visiblePlans(account).filter((p) => employeeIds.has(p.employeeId));
  for (const employee of employees) employee.planCount = plans.filter((p) => p.employeeId === employee.id && p.state !== "archived").length;
  const result: HrWorkspace = {
    account, asOf: AS_OF, departments,
    employees: account.permissions.profiles || account.role === "employee" ? employees : [],
    skills: getSkills().map((s) => ({ id: s.skill_id, name: s.name })), plans: plans.map(planView),
    overview: account.permissions.overview ? { employees: employees.length, withGaps: employees.filter((e) => e.gaps.length).length, withoutPlan: employees.filter((e) => e.gaps.length && !hrState().plans.some((p) => p.employeeId === e.id && p.state !== "archived")).length, activePlans: hrState().plans.filter((p) => employeeIds.has(p.employeeId) && p.state === "published").length, skills: skillOverview(employees) } : null,
    accounts: account.permissions.access ? hrState().accounts.map(publicAccount) : null,
    directory: account.permissions.access ? getEmployees().map((e) => ({ id: e.employee_id, name: e.full_name, department: e.department })) : [],
    events: getEvents().map((e) => ({ event_id: e.event_id, title: e.title, duration_hours: e.duration_hours, type: e.type })),
  };
  return json(result);
});
export const candidatesGet = route((request) => {
  const account = currentAccount(request);
  requirePermission(account, "profiles");
  const employeeId = string(new URL(request.url).searchParams.get("employeeId"), "Сотрудник");
  scopedEmployee(account, employeeId);
  return json({ candidates: candidatesFor(employeeId) });
});
function stepContent(step: PlanStep): string {
  return JSON.stringify([step.eventId, step.kind, step.dueDate, step.title, step.description, step.hours, step.skillId]);
}
function readSteps(value: unknown, employeeId: string, previous?: LearningPlan, preserveAssigned = false): PlanStep[] {
  if (!Array.isArray(value) || !value.length || value.length > 12) throw new HrError("В плане должно быть от 1 до 12 активностей");
  const candidates = candidatesFor(employeeId);
  const completed = new Set(previous ? planView(previous).completedEventIds : []);
  const ids = new Set<string>();
  const steps = value.map((step: unknown): PlanStep => {
    if (!step || typeof step !== "object" || Array.isArray(step)) throw new HrError("Некорректная активность");
    const s = step as Record<string, unknown>;
    const eventId = string(s.eventId, "Активность");
    if (ids.has(eventId)) throw new HrError("Активность повторяется в плане");
    ids.add(eventId);
    const existing = previous?.steps.find((item) => item.eventId === eventId);
    if (existing && completed.has(eventId)) {
      if (stepContent(s as unknown as PlanStep) !== stepContent(existing)) throw new HrError("Выполненный шаг нельзя изменить. Добавьте новый шаг.", 409);
      return { ...existing };
    }
    if (existing && s.kind !== existing.kind) throw new HrError("Нельзя менять тип существующего шага");
    const dueDate = string(s.dueDate, "Срок");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(Date.parse(dueDate)) || new Date(dueDate).toISOString().slice(0, 10) !== dueDate || (dueDate < AS_OF && dueDate !== existing?.dueDate)) throw new HrError(`Срок должен быть не раньше ${AS_OF}`);
    if (s.kind === "task") {
      if (!eventId.startsWith("task:") || typeof s.hours !== "number" || !Number.isFinite(s.hours) || s.hours < 0.25 || s.hours > 80) throw new HrError("Проверьте практический шаг и его длительность");
      const skillId = typeof s.skillId === "string" ? s.skillId : undefined;
      if (skillId && !getSkills().some((skill) => skill.skill_id === skillId)) throw new HrError("Неизвестный навык");
      return { kind: "task", eventId, dueDate, title: string(s.title, "Название шага"), description: string(s.description, "Описание шага", 1500), hours: s.hours, skillId };
    }
    const candidate = candidates.find((c) => c.eventId === eventId);
    // Existing assignments survive changes in the employee's skills; new courses must be eligible.
    if (existing && preserveAssigned && (!candidate || dueDate === existing.dueDate)) return { eventId, dueDate };
    if (!candidate) throw new HrError("Активность больше не подходит сотруднику. Обновите подбор.");
    if (candidate.nextSession && dueDate < candidate.nextSession.slice(0, 10)) throw new HrError(`Срок раньше ближайшей сессии «${candidate.title}»`);
    return { eventId, dueDate };
  });
  if ([...completed].some((id) => !ids.has(id))) throw new HrError("Выполненные шаги должны остаться в плане", 409);
  return steps;
}
export const plansPost = route(async (request) => {
  const account = currentAccount(request);
  const data = await body(request);
  const action = string(data.action, "Действие");
  const state = hrState();
  const plan = action !== "create" && typeof data.id === "string" ? state.plans.find((p) => p.id === data.id) : undefined;
  if (action !== "create" && !plan) throw new HrError("План не найден", 404);
  const employeeId = action === "create" ? string(data.employeeId, "Сотрудник") : plan!.employeeId;
  scopedEmployee(account, employeeId);
  if (action === "complete_task") {
    if (account.role !== "employee" || account.employeeId !== employeeId || plan!.state !== "published" || plan!.response !== "accepted") throw new HrError("Сначала примите собственный опубликованный план", 403);
    const step = plan!.steps.find((s) => s.eventId === data.stepId && s.kind === "task");
    if (!step) throw new HrError("Практический шаг не найден", 404);
    step.doneAt ??= new Date().toISOString();
    plan!.updatedAt = new Date().toISOString();
  } else if (action === "respond") {
    if (account.role !== "employee" || account.employeeId !== employeeId || plan!.state !== "published") throw new HrError("Можно принять только собственный опубликованный план", 403);
    if (data.response !== "accepted" && data.response !== "declined") throw new HrError("Неизвестный ответ");
    plan!.response = data.response;
    plan!.updatedAt = new Date().toISOString();
  } else {
    requirePermission(account, "plans");
    if (action === "create" || action === "update") {
      if (plan?.state === "archived") throw new HrError("Архивный план нельзя редактировать", 409);
      if (plan && data.expectedUpdatedAt !== plan.updatedAt) throw new HrError("План уже изменился. Закройте редактор, обновите список и откройте план снова.", 409);
      const title = string(data.title, "Название");
      const goal = string(data.goal, "Цель", 600);
      const note = typeof data.note === "string" ? data.note.trim() : "";
      if (note.length > 1500) throw new HrError("Комментарий слишком длинный");
      const steps = readSteps(data.steps, employeeId, plan, true);
      const overlapping = state.plans.some((p) => p.id !== plan?.id && p.employeeId === employeeId && p.state !== "archived" && p.steps.some((s) => steps.some((next) => next.eventId === s.eventId)));
      if (overlapping) throw new HrError("Одна из активностей уже есть в действующем плане этого сотрудника", 409);
      if (plan) {
        const changed = title !== plan.title || goal !== plan.goal || note !== plan.note || JSON.stringify(steps.map(stepContent)) !== JSON.stringify(plan.steps.map(stepContent));
        if (changed) Object.assign(plan, { title, goal, note, steps, response: "pending", updatedAt: new Date(Math.max(Date.now(), Date.parse(plan.updatedAt) + 1)).toISOString() });
      }
      else state.plans.unshift({ id: randomUUID(), employeeId, title, goal, note, steps, state: "draft", response: "pending", createdBy: account.name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), baselineHistoryIds: getHistory(employeeId).map((h) => h.record_id) });
    } else if (action === "publish") {
      if (plan!.state !== "draft") throw new HrError("Опубликовать можно только черновик", 409);
      readSteps(plan!.steps, employeeId, plan);
      plan!.state = "published";
      plan!.updatedAt = new Date().toISOString();
    } else if (action === "revise") {
      if (plan!.state !== "published") throw new HrError("Вернуть в черновик можно только опубликованный план", 409);
      plan!.state = "draft";
      plan!.response = "pending";
      plan!.updatedAt = new Date().toISOString();
    } else if (action === "archive") {
      plan!.state = "archived";
      plan!.updatedAt = new Date().toISOString();
    } else throw new HrError("Неизвестное действие");
  }
  saveHrState();
  return json({ ok: true });
});
