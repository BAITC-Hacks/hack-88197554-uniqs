// POST /api/mentor { employeeId } → SSE-поток AgentStep.
import { getEmployee } from "@/lib/store";
import { sseStream } from "@/lib/sse";
import { runMentor } from "./agent";

export async function postMentorRoute(req: Request) {
  const body = (await req.json().catch(() => null)) as { employeeId?: unknown } | null;
  const employeeId = body?.employeeId;
  if (typeof employeeId !== "string") {
    return Response.json({ error: "Ожидается { employeeId }" }, { status: 400 });
  }
  if (!getEmployee(employeeId)) {
    return Response.json({ error: `Сотрудник ${employeeId} не найден` }, { status: 404 });
  }
  return sseStream(runMentor(employeeId));
}
