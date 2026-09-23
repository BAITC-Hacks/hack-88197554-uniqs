// Both files are validated before any synchronous store writes.
import { appendHistory, getAllHistory, getEmployees, upsertEmployees } from "@/lib/store";
import { historyKey, parseEmployees, parseHistory } from "./parse";
import { ImportError, MAX_FILE_BYTES, type ImportResult } from "./types";

function fileFrom(form: FormData, name: string): File | null {
  const values = form.getAll(name);
  if (!values.length) return null;
  if (values.length !== 1 || !(values[0] instanceof File)) throw new ImportError(`${name}: выберите один файл.`);
  const file = values[0];
  if (!file.size) throw new ImportError(`${name}: файл пуст.`);
  if (file.size > MAX_FILE_BYTES) throw new ImportError(`${name}: размер файла не должен превышать 5 МБ.`, 413);
  return file;
}

export async function postUploadRoute(req: Request) {
  try {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host") ?? new URL(req.url).host;
    if ((origin && new URL(origin).host !== host) || req.headers.get("sec-fetch-site") === "cross-site") throw new ImportError("Загрузите файлы со страницы импорта приложения.", 403);
    if (Number(req.headers.get("content-length")) > 2 * MAX_FILE_BYTES + 65536) throw new ImportError("Общий размер файлов превышает 10 МБ.", 413);
    const form = await req.formData().catch(() => { throw new ImportError("Ожидается форма с employees.json и/или activity_history.csv."); });
    for (const key of form.keys()) if (key !== "employees.json" && key !== "activity_history.csv") throw new ImportError(`Неизвестное поле ${key}. Нужны employees.json и/или activity_history.csv.`);
    const employeeFile = fileFrom(form, "employees.json");
    const historyFile = fileFrom(form, "activity_history.csv");
    if (!employeeFile && !historyFile) throw new ImportError("Выберите хотя бы один файл: employees.json или activity_history.csv.");
    const [employeeText, historyText] = await Promise.all([employeeFile?.text(), historyFile?.text()]);
    const employees = employeeText === undefined ? [] : parseEmployees(employeeText);
    const history = historyText === undefined ? [] : parseHistory(historyText, employees);
    const current = getEmployees();
    const existingIds = new Set(current.map(e => e.employee_id));
    const fingerprints = new Set(getAllHistory().map(historyKey));
    const recordIds = new Set(getAllHistory().map(h => h.record_id));
    let skippedHistory = 0, renamedHistory = 0;
    const fresh = history.filter(record => {
      const key = historyKey(record);
      if (fingerprints.has(key)) { skippedHistory++; return false; }
      fingerprints.add(key);
      // appendHistory assigns a fresh ID when the jury's IDs overlap the starter kit.
      if (recordIds.has(record.record_id)) renamedHistory++;
      recordIds.add(record.record_id);
      return true;
    });
    const addedEmployees = employees.filter(e => !existingIds.has(e.employee_id)).length;
    const affected = new Set([...employees.map(e => e.employee_id), ...history.map(h => h.employee_id)]);
    upsertEmployees(employees);
    appendHistory(fresh);
    const result: ImportResult = {
      employees: employees.length, history: fresh.length, addedEmployees,
      updatedEmployees: employees.length - addedEmployees, skippedHistory, renamedHistory,
      affectedEmployees: getEmployees().filter(e => affected.has(e.employee_id))
        .map(({ employee_id, full_name, role, grade }) => ({ employee_id, full_name, role, grade })),
    };
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ImportError) return Response.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
