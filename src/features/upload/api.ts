import { appendHistory, upsertEmployees } from "@/lib/store";
import type { UploadResult } from "@/lib/types";
import { UPLOAD_FIELDS } from "./fields";
import { newHistory, parseEmployees, parseHistory, UploadError } from "./validation";

function uploadedFile(form: FormData, field: string): File | null {
  const values = form.getAll(field);
  if (!values.length) return null;
  if (values.length !== 1 || !(values[0] instanceof File) || values[0].size === 0) {
    throw new UploadError(`${field}: передайте один непустой файл.`);
  }
  return values[0];
}

export async function postUploadRoute(req: Request) {
  try {
    const form = await req.formData().catch(() => {
      throw new UploadError("Ожидается multipart/form-data с файлами employees.json и/или activity_history.csv.");
    });
    for (const field of form.keys()) {
      if (field !== UPLOAD_FIELDS.employees && field !== UPLOAD_FIELDS.history) {
        throw new UploadError(`Неизвестное поле ${field}. Используйте employees.json и/или activity_history.csv.`);
      }
    }
    const employeeFile = uploadedFile(form, UPLOAD_FIELDS.employees);
    const historyFile = uploadedFile(form, UPLOAD_FIELDS.history);
    if (!employeeFile && !historyFile) throw new UploadError("Выберите хотя бы один файл.");
    const [employeeText, historyText] = await Promise.all([
      employeeFile?.text(), historyFile?.text(),
    ]);
    const employees = employeeText === undefined ? [] : parseEmployees(employeeText);
    const history = historyText === undefined ? [] : newHistory(parseHistory(historyText, employees));
    // Все проверки завершены. Между проверкой дублей и записью нет await.
    const result: UploadResult = {
      employees: upsertEmployees(employees),
      history: appendHistory(history),
    };
    return Response.json(result);
  } catch (error) {
    if (error instanceof UploadError) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ error: "Не удалось обработать загрузку. Проверьте доступность стартового датасета на сервере." }, { status: 500 });
  }
}
