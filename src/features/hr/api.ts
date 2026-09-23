// GET /api/hr → HrSummary. Пока пустые массивы нужной формы; содержимое делает фича hr.
import type { HrSummary } from "@/lib/types";

export async function getHrRoute() {
  const summary: HrSummary = { weakSkills: [], noStep: [], participation: [] };
  return Response.json(summary);
}
