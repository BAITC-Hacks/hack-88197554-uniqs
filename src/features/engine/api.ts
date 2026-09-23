// Route handlers engine. Тонкие реэкспорты лежат в src/app/api/**/route.ts.
import { getEmployee, getEmployees, getEvent, getEvents } from "@/lib/store";
import type { ProgressRequest } from "@/lib/types";
import { getProfile } from "./profile";
import { ActivityUnavailableError, completeActivity } from "./progress";
import { recommend } from "./recommend";

const notFound = (error: string) => Response.json({ error }, { status: 404 });

export async function getEmployeesRoute() {
  return Response.json(getEmployees());
}

export async function getEventsRoute() {
  return Response.json(getEvents());
}

export async function getProfileRoute(_req: Request, ctx: RouteContext<"/api/profile/[id]">) {
  const { id } = await ctx.params;
  const profile = getProfile(id);
  return profile ? Response.json(profile) : notFound(`Сотрудник ${id} не найден`);
}

export async function getRecommendRoute(_req: Request, ctx: RouteContext<"/api/recommend/[id]">) {
  const { id } = await ctx.params;
  return getEmployee(id) ? Response.json(recommend(id)) : notFound(`Сотрудник ${id} не найден`);
}

function parseProgress(body: unknown): ProgressRequest | null {
  if (!body || typeof body !== "object") return null;
  const { employeeId, eventId, status } = body as Record<string, unknown>;
  if (typeof employeeId !== "string" || typeof eventId !== "string") return null;
  if (status !== "completed" && status !== "declined") return null;
  return { employeeId, eventId, status };
}

export async function postProgressRoute(req: Request) {
  const body = parseProgress(await req.json().catch(() => null));
  if (!body) {
    return Response.json(
      { error: "Ожидается { employeeId, eventId, status: 'completed' | 'declined' }" },
      { status: 400 },
    );
  }
  if (!getEmployee(body.employeeId)) return notFound(`Сотрудник ${body.employeeId} не найден`);
  if (!getEvent(body.eventId)) return notFound(`Активность ${body.eventId} не найдена`);
  try {
    return Response.json(completeActivity(body.employeeId, body.eventId, body.status));
  } catch (error) {
    if (error instanceof ActivityUnavailableError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
