// Тестирование: автоматизация и нагрузочные метрики.
import type { Task } from "./types";

const hundred = Array.from({ length: 100 }, (_, i) => 100 - i);

export const QUALITY_TASKS: Record<string, Task> = {
  EV_018: {
    kind: "ts",
    title: "Найдите нестабильные автотесты",
    brief: "CI сохраняет результаты прогонов на одном и том же коде: { test, passed }. Тест нестабилен (flaky), если он хотя бы раз прошёл и хотя бы раз упал. Напишите findFlaky(runs): верните имена нестабильных тестов по алфавиту и без повторов. Стабильно падающий тест — это баг, а не flaky.",
    functionName: "findFlaky",
    example: {
      call: "findFlaky([{ test: \"login\", passed: true }, { test: \"login\", passed: false }, { test: \"transfer\", passed: true }])",
      result: "[\"login\"]",
      note: "login и проходил, и падал; transfer стабилен.",
    },
    starter: `interface Run { test: string; passed: boolean }

function findFlaky(runs: Run[]): string[] {
  // Соберите для каждого теста, были ли успехи и падения
  return [];
}
`,
    tests: [
      { label: "Пример из условия", args: [[{ test: "login", passed: true }, { test: "login", passed: false }, { test: "transfer", passed: true }]], expected: ["login"] },
      { label: "Нет прогонов", args: [[]], expected: [] },
      { label: "Стабильно падающий тест — не flaky", args: [[{ test: "export", passed: false }, { test: "export", passed: false }, { test: "login", passed: true }]], expected: [] },
      { label: "Имена по алфавиту", args: [[{ test: "transfer", passed: true }, { test: "transfer", passed: false }, { test: "auth", passed: true }, { test: "auth", passed: false }]], expected: ["auth", "transfer"] },
      { label: "Без повторов при многих падениях", args: [[{ test: "card", passed: true }, { test: "card", passed: false }, { test: "card", passed: false }, { test: "card", passed: true }]], expected: ["card"] },
    ],
    hints: [
      "Заведите два множества: const passed = new Set<string>(); const failed = new Set<string>(); и разложите прогоны.",
      "Нестабильные — те, что есть в обоих множествах: [...passed].filter(name => failed.has(name)).",
      "Не забудьте .sort() в конце: результат нужен по алфавиту.",
    ],
    takeaway: "Вы отделили нестабильные тесты от настоящих падений — первый шаг к надёжному CI.",
    solution: `interface Run { test: string; passed: boolean }

function findFlaky(runs: Run[]): string[] {
  const seen = new Map<string, { ok: boolean; broken: boolean }>();
  for (const run of runs) {
    const entry = seen.get(run.test) ?? { ok: false, broken: false };
    if (run.passed) entry.ok = true;
    else entry.broken = true;
    seen.set(run.test, entry);
  }
  return [...seen].filter(([, entry]) => entry.ok && entry.broken).map(([name]) => name).sort();
}
`,
  },

  EV_019: {
    kind: "ts",
    title: "Посчитайте p95 времени ответа API",
    brief: "Нагрузочный тест API переводов вернул время ответа каждого запроса в мс. Напишите p95(latencies) методом ближайшего ранга: отсортируйте значения по возрастанию и возьмите элемент с номером ⌈0,95 · n⌉ (нумерация с 1). Для пустого списка верните null. Исходный массив не меняйте.",
    functionName: "p95",
    example: {
      call: "p95([120, 80, 95, 300, 110])",
      result: "300",
      note: "n = 5, ⌈4,75⌉ = 5 — пятое значение по возрастанию.",
    },
    starter: `function p95(latencies: number[]): number | null {
  // Отсортируйте копию и возьмите нужный ранг
  return null;
}
`,
    tests: [
      { label: "Пример из условия", args: [[120, 80, 95, 300, 110]], expected: 300 },
      { label: "Пустой список", args: [[]], expected: null },
      { label: "Один запрос", args: [[42]], expected: 42 },
      { label: "20 запросов: ранг 19", args: [[110, 30, 200, 70, 150, 10, 190, 50, 130, 90, 170, 20, 180, 60, 140, 100, 160, 40, 120, 80]], expected: 190 },
      { label: "100 запросов: ранг 95", args: [hundred], expected: 95 },
      { label: "Исходный массив не меняется", args: [[300, 100, 200]], expected: 300, pure: true },
    ],
    hints: [
      "Сортируйте копию с компаратором: [...latencies].sort((a, b) => a - b). Без компаратора sort сравнивает числа как строки.",
      "Ранг: const rank = Math.ceil(0.95 * sorted.length); индекс в массиве — rank - 1.",
      "Не забудьте ранний выход: if (latencies.length === 0) return null;",
    ],
    takeaway: "Вы посчитали перцентиль задержки так, как его считают инструменты нагрузочного тестирования.",
    solution: `function p95(latencies: number[]): number | null {
  if (!latencies.length) return null;
  const sorted = [...latencies].sort((a, b) => a - b);
  const rank = Math.ceil((95 * sorted.length) / 100);
  return sorted[rank - 1];
}
`,
  },
};
