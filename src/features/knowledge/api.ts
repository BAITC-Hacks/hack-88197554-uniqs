import { getProfile } from "@/features/engine/profile";
import { buildKnowledge } from "./context";

export function getKnowledgeRoute(req: Request) {
  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  if (!employeeId) return Response.json({ error: "Укажи employeeId" }, { status: 400 });
  const profile = getProfile(employeeId);
  if (!profile) return Response.json({ error: "Сотрудник не найден" }, { status: 404 });
  return Response.json(buildKnowledge(profile, (url.searchParams.get("q") ?? "").slice(0, 2000)), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
