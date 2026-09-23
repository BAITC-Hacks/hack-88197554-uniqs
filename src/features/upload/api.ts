// POST /api/upload (multipart: employees.json и/или activity_history.csv) → UploadResult.
// Пока только принимает форму; разбор и запись в store делает фича upload (store.upsertEmployees / appendHistory / parseHistoryCsv).
import type { UploadResult } from "@/lib/types";

export async function postUploadRoute(req: Request) {
  await req.formData().catch(() => null);
  const result: UploadResult = { employees: 0, history: 0 };
  return Response.json(result);
}
