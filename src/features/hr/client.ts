export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function hrRequest<T>(path: string, data?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(`/api/hr${path}`, data === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const value = await response.json();
  if (!response.ok) throw new ApiError(value.error ?? "Не удалось выполнить запрос", response.status);
  return value as T;
}
export const fieldClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400";
export const dateLabel = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("ru-RU");
