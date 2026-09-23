import { randomUUID } from "node:crypto";
import { AS_OF, getEmployees, getHistory, getSkill } from "@/lib/store";
import { body, currentAccount, HrError, inScope, json, requirePermission, route } from "./access";
import { candidatesFor, employeeView } from "./competencies";
import { hrState, saveHrState } from "./state";
import { learningTemplates, PRACTICE_BRIEFS } from "./templates";
import type { Account, LearningPlan, PlanStep } from "./types";

function afterDays(days: number) {
  const date = new Date(`${AS_OF}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function task(title: string, description: string, days: number, hours: number, skillId?: string): PlanStep {
  return { eventId: `task:${randomUUID()}`, kind: "task", title, description, dueDate: afterDays(days), hours, skillId };
}
export function seedLearningPlans(account: Account, options: { department?: string; templateId?: string } = {}) {
  requirePermission(account, "plans");
  requirePermission(account, "profiles");
  const employees = getEmployees().filter((e) => inScope(account, e));
  if (options.department && !employees.some((e) => e.department === options.department)) throw new HrError("Отдел недоступен", 403);
  const templates = learningTemplates();
  if (options.templateId && !templates.some((t) => t.id === options.templateId)) throw new HrError("Шаблон не найден", 404);
  const state = hrState();
  const created: LearningPlan[] = [];
  let skipped = 0;
  let withCourses = 0;
  let withPracticeOnly = 0;
  let careerDiscovery = 0;
  for (const employee of employees) {
    if (options.department && employee.department !== options.department) continue;
    const view = employeeView(employee);
    const template = templates.find((t) => view.target ? t.role === view.target.role && t.grade === view.target.grade : t.id === "career-discovery") ?? templates.find((t) => t.id === "career-discovery")!;
    if (options.templateId && options.templateId !== template.id) continue;
    if (state.plans.some((p) => p.employeeId === employee.employee_id && p.state !== "archived")) { skipped++; continue; }
    const candidates = candidatesFor(employee.employee_id).slice(0, 3);
    const orderedGaps = [...view.gaps].sort((a, b) => Number(b.critical) - Number(a.critical) || (b.required - b.current) - (a.required - a.current));
    const focus = orderedGaps[0];
    const focusName = focus ? getSkill(focus.skillId)?.name : undefined;
    const steps: PlanStep[] = candidates.map((c, i) => ({ eventId: c.eventId, dueDate: [afterDays(14 * (i + 1)), c.nextSession?.slice(0, 10) ?? AS_OF].sort().at(-1)! }));
    let note: string;
    if (!view.target) {
      careerDiscovery++;
      steps.push(task("Встреча о карьерном направлении", "Обсудите с наставником интересы, сильные стороны и желаемую роль. Зафиксируйте 2–3 направления для сравнения.", 7, 1));
      steps.push(task("Выбрать цель и следующий шаг", "Сравните требования к интересующим ролям, выберите цель в профиле и согласуйте следующий индивидуальный план обучения.", 14, 1));
      note = "Карьерная цель пока не выбрана. Начинаем с определения направления; курсы и рост навыков не назначаются произвольно.";
    } else {
      if (candidates.length) withCourses++; else withPracticeOnly++;
      steps.push(task(focusName ? `Практика: ${focusName}` : "Практика по приоритетной компетенции", `${PRACTICE_BRIEFS[employee.role] ?? "Выполните небольшое учебное задание, связанное с текущей ролью, и подготовьте результат для обсуждения."} ${focus ? `Покажите применение навыка ${focusName ?? focus.skillId}; текущий уровень ${focus.current}, цель ${focus.required}.` : "Покажите применение сильных сторон на более сложном рабочем примере."}`, template.durationDays - 7, 3, focus?.skillId));
      const latestCourse = steps.filter((s) => s.kind !== "task").map((s) => s.dueDate).sort().at(-1);
      const practice = steps.find((s) => s.kind === "task")!;
      if (latestCourse && latestCourse >= practice.dueDate) { const date = new Date(`${latestCourse}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 7); practice.dueDate = date.toISOString().slice(0, 10); }
      const review = task("Встреча с наставником: разбор результата", "Покажите результат практики, получите обратную связь и договоритесь о следующем шаге. Уровень навыка меняется после подтверждённой учебной активности или отдельного ревью.", template.durationDays, 1);
      if (practice.dueDate >= review.dueDate) { const date = new Date(`${practice.dueDate}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 7); review.dueDate = date.toISOString().slice(0, 10); }
      steps.push(review);
      note = candidates.length ? "Активности подобраны по карьерной цели, разрывам, допускам и истории. Практика и встреча с наставником помогают применить знания. План ожидает согласия сотрудника." : view.gaps.length ? "В каталоге сейчас нет доступного курса, соответствующего цели и условиям участия. Предложены практика и обсуждение с наставником; новые курсы следует подобрать после уточнения каталога или требований." : "Требования цели уже выполнены. Предложены применение знаний и обсуждение следующей цели без повторного назначения пройденного обучения.";
    }
    const now = new Date().toISOString();
    created.push({
      id: randomUUID(), employeeId: employee.employee_id, templateId: template.id,
      title: `План развития · ${employee.full_name}`,
      goal: view.target ? `Подготовка к роли ${view.target.role} · ${view.target.grade}` : "Определить карьерное направление и согласовать следующий шаг",
      note, steps, state: "published", response: "pending", createdBy: account.name, createdAt: now, updatedAt: now,
      baselineHistoryIds: getHistory(employee.employee_id).map((h) => h.record_id),
    });
  }
  state.plans.push(...created);
  if (created.length) saveHrState();
  return { created: created.length, skipped, withCourses, withPracticeOnly, careerDiscovery };
}
export const templatesGet = route((request) => {
  const account = currentAccount(request);
  requirePermission(account, "plans");
  const employees = getEmployees().filter((e) => inScope(account, e)).map(employeeView);
  return json({ templates: learningTemplates().map((t) => ({ ...t, matchingEmployees: employees.filter((e) => t.role ? e.target?.role === t.role && e.target.grade === t.grade : !e.target).length })) });
});
export const seedPost = route(async (request) => {
  const account = currentAccount(request);
  const data = await body(request);
  if (data.department !== undefined && typeof data.department !== "string") throw new HrError("Некорректный отдел");
  if (data.templateId !== undefined && typeof data.templateId !== "string") throw new HrError("Некорректный шаблон");
  return json(seedLearningPlans(account, { department: data.department as string | undefined, templateId: data.templateId as string | undefined }));
});
