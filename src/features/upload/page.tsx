"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UploadResult } from "@/lib/types";
import { UPLOAD_FIELDS } from "./fields";

export default function UploadPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    for (const field of Object.values(UPLOAD_FIELDS)) {
      const file = form.get(field);
      if (file instanceof File && !file.name) form.delete(field);
    }
    setResult(null);
    setError(null);
    if (![...form.values()].some((value) => value instanceof File)) {
      setError("Выберите хотя бы один файл.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить файлы.");
      setResult(data as UploadResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось загрузить файлы.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-[720px] space-y-6 py-16">
      {/* Полная навигация заново загружает список сотрудников в городе. */}
      <Button variant="outline" onClick={() => window.location.assign("/")}>
        <ArrowLeft /> В город
      </Button>
      <Card>
        <CardHeader>
          <CardTitle><h1 className="text-2xl">Загрузка профилей и истории</h1></CardTitle>
          <CardDescription>
            Выберите один или оба файла в формате стартового кита. Существующие профили
            обновятся по employee_id, новые сотрудники появятся в городе.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="employees-file" className="block font-medium">Профили — employees.json</label>
              <input id="employees-file" name={UPLOAD_FIELDS.employees} type="file" accept=".json,application/json"
                disabled={busy} className="block w-full rounded-lg border p-3 file:mr-4 file:cursor-pointer" />
              <p className="text-sm text-muted-foreground">JSON-объект с массивом employees.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="history-file" className="block font-medium">История — activity_history.csv</label>
              <input id="history-file" name={UPLOAD_FIELDS.history} type="file" accept=".csv,text/csv"
                disabled={busy} className="block w-full rounded-lg border p-3 file:mr-4 file:cursor-pointer" />
              <p className="text-sm text-muted-foreground">CSV с заголовком. Повторные записи пропускаются.</p>
            </div>
            <Button type="submit" disabled={busy}><Upload />{busy ? "Загрузка…" : "Загрузить"}</Button>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>}
            {result && (
              <div role="status" className="space-y-2 rounded-lg bg-muted p-4">
                <p>Профилей добавлено или обновлено: <strong>{result.employees}</strong>.</p>
                <p>Новых записей истории: <strong>{result.history}</strong>.</p>
                <p>Вернитесь в город, чтобы выбрать загруженного сотрудника.</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
