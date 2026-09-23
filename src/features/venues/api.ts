import { AS_OF, getEvent, getHistory } from "@/lib/store";
import { getProfile } from "@/features/engine/profile";
import { ActivityUnavailableError, completeActivity } from "@/features/engine/progress";
import { participationBlock, type CheckResult, type PublicTask } from "./exercises";
import { checkCode, checkQuiz, hintLimit, publicTask, scoreFor, taskFor } from "./tasks";

/** Попытки проверки и открытые подсказки по паре сотрудник + активность (в памяти процесса). */
const attempts = new Map<string, { attempts: number; hints: number }>();

/** GET /api/venues/practice?eventIds=EV_012,EV_022 → публичные задания без эталонов и правильных ответов. */
export async function getPracticeRoute(req: Request) {
  const ids = (new URL(req.url).searchParams.get("eventIds") ?? "").split(",").map(id => id.trim()).filter(Boolean).slice(0, 80);
  const tasks: Record<string, PublicTask> = {};
  for (const id of ids) {
    const event = getEvent(id);
    if (event && !event.mandatory) tasks[id] = publicTask(taskFor(event), event);
  }
  return Response.json({ tasks });
}

export async function postPracticeRoute(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Передайте решение задания." }, { status: 400 });
  const { employeeId, eventId, code, answers, hints, complete } = body as Record<string, unknown>;
  if (typeof employeeId !== "string" || typeof eventId !== "string" || typeof complete !== "boolean") {
    return Response.json({ error: "Не указан сотрудник, активность или действие." }, { status: 400 });
  }
  const event = getEvent(eventId);
  const profile = getProfile(employeeId);
  if (!event || !profile) return Response.json({ error: "Сотрудник или активность не найдены." }, { status: 404 });
  const blocked = participationBlock(event, profile);
  if (blocked) return Response.json({ error: blocked }, { status: 409 });

  const task = taskFor(event);
  let checks: CheckResult[];
  if (task.kind === "quiz") {
    if (!Array.isArray(answers) || answers.length !== task.questions.length
      || answers.some((answer, i) => !Number.isInteger(answer) || answer < 0 || answer >= task.questions[i].options.length)) {
      return Response.json({ error: "Выберите ответ в каждой ситуации." }, { status: 400 });
    }
    checks = checkQuiz(task, answers as number[]);
  } else {
    if (typeof code !== "string" || !code.trim() || code.length > 6000) return Response.json({ error: "Введите код, не более 6000 символов." }, { status: 400 });
    checks = checkCode(task, code);
  }

  const key = `${employeeId}:${eventId}`;
  const state = attempts.get(key) ?? { attempts: 0, hints: 0 };
  const opened = typeof hints === "number" && Number.isFinite(hints) ? Math.min(Math.max(0, Math.floor(hints)), hintLimit(task)) : 0;
  state.hints = Math.max(state.hints, opened);
  // «Засчитать» после успешной проверки — не новая попытка.
  if (!complete || state.attempts === 0) state.attempts += 1;
  attempts.set(key, state);

  const passed = checks.every(check => check.passed);
  const score = passed ? scoreFor(state.attempts, state.hints) : undefined;
  if (!passed || !complete) return Response.json({ passed, checks, ...(score !== undefined ? { score } : {}) });

  // Check and completion happen together, using the submitted solution, with no client-side proof token.
  let delta;
  try {
    delta = completeActivity(employeeId, eventId, "completed");
  } catch (error) {
    if (error instanceof ActivityUnavailableError) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
  if (!delta) return Response.json({ error: "Не удалось засчитать активность." }, { status: 500 });
  // Engine пишет дату с временем внутри демо-дня: сравниваем только день.
  const record = getHistory(employeeId).filter(h => h.event_id === eventId && h.status === "completed" && h.date.slice(0, 10) === AS_OF).at(-1);
  if (record) record.score = score ?? null;
  attempts.delete(key);
  return Response.json({ passed, checks, score, delta });
}
