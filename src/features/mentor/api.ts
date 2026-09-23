// POST /api/mentor { employeeId } → SSE-поток AgentStep.
import { getEmployee } from "@/lib/store";
import { sseStream } from "@/lib/sse";
import { runMentor } from "./agent";
import { parseMessages } from "./chat";

export async function postMentorRoute(req: Request) {
  const body = (await req.json().catch(() => null)) as { employeeId?: unknown; messages?: unknown; excludedEventIds?: unknown } | null;
  const employeeId = body?.employeeId;
  if (typeof employeeId !== "string") {
    return Response.json({ error: "Ожидается { employeeId }" }, { status: 400 });
  }
  if (!getEmployee(employeeId)) {
    return Response.json({ error: `Сотрудник ${employeeId} не найден` }, { status: 404 });
  }
  const messages = parseMessages(body?.messages);
  if (!messages) return Response.json({ error: "Ожидается до 12 сообщений user/assistant, каждое до 4000 символов." }, { status: 400 });
  const excluded = body?.excludedEventIds ?? [];
  if (!Array.isArray(excluded) || excluded.length > 100 || excluded.some((id) => typeof id !== "string" || id.length > 100)) {
    return Response.json({ error: "Некорректный список отложенных активностей." }, { status: 400 });
  }
  return sseStream(runMentor(employeeId, messages, excluded));
}
