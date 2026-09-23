import { getHrReport } from "./summary";

export async function getHrRoute() {
  return Response.json(getHrReport().summary, { headers: { "Cache-Control": "no-store" } });
}
