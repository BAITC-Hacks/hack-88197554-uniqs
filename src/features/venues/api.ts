import { getEvent } from "@/lib/store";
import { getProfile } from "@/features/engine/profile";
import { completeActivity } from "@/features/engine/progress";
import { exerciseFor, participationBlock, PYTHON_CASES, type CheckResult } from "./exercises";
import { runPython } from "./python";

export async function postPracticeRoute(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Передайте решение задания." }, { status: 400 });
  const { employeeId, eventId, code, answers, complete } = body as Record<string, unknown>;
  if (typeof employeeId !== "string" || typeof eventId !== "string" || typeof complete !== "boolean") {
    return Response.json({ error: "Не указан сотрудник, активность или действие." }, { status: 400 });
  }
  const event = getEvent(eventId);
  const profile = getProfile(employeeId);
  if (!event || !profile) return Response.json({ error: "Сотрудник или активность не найдены." }, { status: 404 });
  const blocked = participationBlock(event, profile);
  if (blocked) return Response.json({ error: blocked }, { status: 409 });
  const exercise = exerciseFor(event);
  let checks: CheckResult[];
  if (exercise.kind === "python") {
    if (typeof code !== "string" || code.length > 6000) return Response.json({ error: "Введите код, не более 6000 символов." }, { status: 400 });
    checks = PYTHON_CASES.map(test => {
      try {
        const result = runPython(code, test.input);
        const passed = typeof result === "number" && Math.abs(result - test.expected) < 1e-9;
        return { label: test.label, passed, detail: `${JSON.stringify(test.input)} → ${JSON.stringify(result)}; ожидается ${test.expected}` };
      } catch (error) {
        return { label: test.label, passed: false, detail: error instanceof Error ? error.message : "Проверьте код." };
      }
    });
  } else {
    if (!Array.isArray(answers) || answers.length !== exercise.questions.length || answers.some((answer, i) => !Number.isInteger(answer) || answer < 0 || answer >= exercise.questions[i].options.length)) {
      return Response.json({ error: "Выберите ответ в каждой ситуации." }, { status: 400 });
    }
    checks = exercise.questions.map((question, i) => ({ label: `Ситуация ${i + 1}`, passed: answers[i] === question.correct, detail: question.explanation }));
  }
  const passed = checks.every(check => check.passed);
  // Check and completion happen together, using the submitted solution, with no client-side proof token.
  const delta = passed && complete ? completeActivity(employeeId, eventId, "completed") : undefined;
  return Response.json({ passed, checks, ...(delta ? { delta } : {}) });
}
