"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { actions, getState } from "@/lib/client-store";
import { MAX_FILE_BYTES, type ImportResult } from "./types";

export default function UploadPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<File | null>(null);
  const [history, setHistory] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  function choose(file: File | null, kind: "employees" | "history") {
    (kind === "employees" ? setEmployees : setHistory)(file);
    setResult(null); setRefreshError("");
    setError(file && file.size > MAX_FILE_BYTES ? "Каждый файл должен быть не больше 5 МБ." : "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (!employees && !history)) return;
    setBusy(true); setError(""); setResult(null); setRefreshError("");
    try {
      const form = new FormData();
      if (employees) form.append("employees.json", employees);
      if (history) form.append("activity_history.csv", history);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json() as ImportResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Не удалось импортировать файлы.");
      setResult(data);
      try {
        await actions.loadEmployees();
        const id = getState().employeeId;
        if (data.affectedEmployees.some(e => e.employee_id === id)) actions.selectEmployee(id);
        await actions.refreshProfile();
      } catch {
        setRefreshError("Импорт сохранён. Обновите страницу, чтобы перечитать список сотрудников.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось загрузить файлы. Попробуйте ещё раз.");
    } finally { setBusy(false); }
  }

  async function openEmployee(id: string) {
    setBusy(true); setRefreshError("");
    try {
      await actions.loadEmployees();
      if (!getState().employees.some(e => e.employee_id === id)) throw new Error("Не удалось обновить список сотрудников. Повторите переход.");
      actions.selectEmployee(id);
      router.push("/");
    } catch (error) { setRefreshError(error instanceof Error ? error.message : "Не удалось открыть сотрудника."); }
    finally { setBusy(false); }
  }

  const oversized = [employees, history].some(file => file && file.size > MAX_FILE_BYTES);
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />В город</Link>
      <header>
        <p className="text-sm font-medium text-emerald-700">Career Quest · данные для проверки</p>
        <h1 className="mt-2 text-3xl font-semibold">Импорт профилей и истории</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Добавьте проверочные профили из стартового кита и историю их участия. Можно загрузить оба файла вместе или только один.</p>
      </header>
      <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
        <div className="grid grid-cols-2 gap-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileJson className="size-5 text-emerald-700" />Профили сотрудников</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="employees-file" className="block text-sm font-medium">employees.json</label>
              <input id="employees-file" type="file" accept=".json,application/json" disabled={busy} onChange={e => choose(e.target.files?.[0] ?? null, "employees")} className="block w-full rounded-lg border p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2" />
              <p className="text-xs leading-relaxed text-muted-foreground">Полные профили в объекте с массивом employees или отдельным массивом. До 5 МБ.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-emerald-700" />История активности</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="history-file" className="block text-sm font-medium">activity_history.csv</label>
              <input id="history-file" type="file" accept=".csv,text/csv" disabled={busy} onChange={e => choose(e.target.files?.[0] ?? null, "history")} className="block w-full rounded-lg border p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2" />
              <p className="text-xs leading-relaxed text-muted-foreground">Столбцы из датасета, разделитель — запятая, кодировка UTF-8. До 5 МБ.</p>
            </CardContent>
          </Card>
        </div>
        <div className="rounded-xl bg-muted/60 p-4 text-sm leading-relaxed">
          Профиль с существующим employee_id будет обновлён. История дополняется; одинаковые записи пропускаются.
          При ошибке в любом файле весь импорт отменяется.
          <p className="mt-2 text-muted-foreground">Данные доступны до перезапуска сервера. Используйте синтетические данные хакатона.</p>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <Button type="submit" size="lg" disabled={busy || (!employees && !history) || oversized}><Upload className="size-4" />{busy ? "Обработка…" : "Импортировать"}</Button>
      </form>
      {result && <section aria-label="Результат импорта" aria-live="polite" className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><CheckCircle2 className="size-5 text-emerald-700" />Импорт завершён</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <p>Новых сотрудников<strong className="mt-1 block text-2xl">{result.addedEmployees}</strong></p>
          <p>Профилей обновлено<strong className="mt-1 block text-2xl">{result.updatedEmployees}</strong></p>
          <p>Записей истории добавлено<strong className="mt-1 block text-2xl">{result.history}</strong></p>
        </div>
        {result.skippedHistory > 0 && <p className="text-sm text-muted-foreground">Уже существующих записей истории пропущено: {result.skippedHistory}.</p>}
        {result.renamedHistory > 0 && <p className="text-sm text-muted-foreground">Для {result.renamedHistory} записей с занятыми record_id назначены новые идентификаторы.</p>}
        <div className="divide-y rounded-lg border bg-white">
          {result.affectedEmployees.slice(0, 20).map(employee => <div key={employee.employee_id} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1"><p className="text-sm font-medium">{employee.full_name}</p><p className="text-xs text-muted-foreground">{employee.employee_id} · {employee.role} · {employee.grade}</p></div>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void openEmployee(employee.employee_id)}>Выбрать в городе<ArrowRight className="size-4" /></Button>
          </div>)}
        </div>
        {result.affectedEmployees.length > 20 && <p className="text-xs text-muted-foreground">Показаны первые 20 сотрудников из {result.affectedEmployees.length}. Все доступны в списке сотрудников города.</p>}
      </section>}
      {refreshError && <p role="alert" className="text-sm text-amber-800">{refreshError}</p>}
    </main>
  );
}
