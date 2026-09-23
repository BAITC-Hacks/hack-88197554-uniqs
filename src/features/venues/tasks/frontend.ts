// Фронтенд: TypeScript, производительность, доступность, React.
import type { Task } from "./types";

export const FRONTEND_TASKS: Record<string, Task> = {
  EV_013: {
    kind: "ts",
    title: "Сузьте unknown до типа Transfer",
    brief: "Запрос на перевод приходит из внешнего API как unknown. Напишите parseTransfer(input): верните { to, amount, currency }, только если input — объект, to — непустая строка, amount — конечное число больше нуля, currency — одно из \"KZT\", \"USD\", \"EUR\". Во всех остальных случаях верните null. Лишние поля в результат не копируйте.",
    functionName: "parseTransfer",
    example: {
      call: "parseTransfer({ to: \"KZ00TEST0001\", amount: 5000, currency: \"KZT\", note: \"аренда\" })",
      result: "{ to: \"KZ00TEST0001\", amount: 5000, currency: \"KZT\" }",
      note: "Поле note отброшено; строка \"5000\" вместо числа дала бы null.",
    },
    starter: `type Currency = "KZT" | "USD" | "EUR";
interface Transfer { to: string; amount: number; currency: Currency }

function parseTransfer(input: unknown): Transfer | null {
  // Сужайте тип шаг за шагом: typeof, проверка каждого поля
  return null;
}
`,
    tests: [
      { label: "Корректный перевод, лишнее поле отброшено", args: [{ to: "KZ00TEST0001", amount: 5000, currency: "KZT", note: "аренда" }], expected: { to: "KZ00TEST0001", amount: 5000, currency: "KZT" } },
      { label: "Дробная сумма в евро", args: [{ to: "KZ00TEST0002", amount: 99.5, currency: "EUR" }], expected: { to: "KZ00TEST0002", amount: 99.5, currency: "EUR" } },
      { label: "Сумма строкой — отказ", args: [{ to: "KZ00TEST0001", amount: "5000", currency: "KZT" }], expected: null },
      { label: "Неизвестная валюта — отказ", args: [{ to: "KZ00TEST0001", amount: 10, currency: "GBP" }], expected: null },
      { label: "Нулевая сумма — отказ", args: [{ to: "KZ00TEST0003", amount: 0, currency: "USD" }], expected: null },
      { label: "null вместо объекта", args: [null], expected: null },
    ],
    hints: [
      "Сначала отсейте не-объекты: if (typeof input !== \"object\" || input === null) return null;",
      "Дальше разберите поля: const { to, amount, currency } = input as Record<string, unknown>; и проверьте typeof каждого.",
      "Для валюты подойдёт type guard: function isCurrency(v: unknown): v is Currency { return v === \"KZT\" || v === \"USD\" || v === \"EUR\"; } — а для суммы Number.isFinite(amount) && amount > 0.",
    ],
    takeaway: "Вы превратили непроверенные данные в строгий тип через сужение и type guard.",
    solution: `type Currency = "KZT" | "USD" | "EUR";
interface Transfer { to: string; amount: number; currency: Currency }
const CURRENCIES: readonly string[] = ["KZT", "USD", "EUR"];

function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && CURRENCIES.includes(value);
}

function parseTransfer(input: unknown): Transfer | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const data = input as { to?: unknown; amount?: unknown; currency?: unknown };
  const { to, amount, currency } = data;
  if (typeof to !== "string" || to.trim() === "") return null;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  if (!isCurrency(currency)) return null;
  return { to, amount, currency };
}
`,
  },

  EV_014: {
    kind: "ts",
    title: "Посчитайте Total Blocking Time",
    brief: "Профайлер выгрузил длинные задачи главного потока веб-приложения: { start, duration } в миллисекундах. Напишите totalBlockingTime(tasks, fcp, tti): учитывайте задачи, которые начались не раньше fcp и раньше tti. Блокирующая часть задачи — всё сверх 50 мс (duration − 50); задачи до 50 мс включительно не блокируют. Верните сумму блокирующих частей.",
    functionName: "totalBlockingTime",
    example: {
      call: "totalBlockingTime([{ start: 100, duration: 120 }, { start: 300, duration: 40 }], 50, 1000)",
      result: "70",
      note: "120 − 50 = 70; задача на 40 мс не блокирует.",
    },
    starter: `interface LongTask { start: number; duration: number }

function totalBlockingTime(tasks: LongTask[], fcp: number, tti: number): number {
  let total = 0;
  // Сложите время сверх 50 мс у задач внутри окна [fcp, tti)
  return total;
}
`,
    tests: [
      { label: "Пример из условия", args: [[{ start: 100, duration: 120 }, { start: 300, duration: 40 }], 50, 1000], expected: 70 },
      { label: "Нет задач", args: [[], 0, 1000], expected: 0 },
      { label: "Ровно 50 мс не блокирует", args: [[{ start: 200, duration: 50 }, { start: 400, duration: 51 }], 0, 1000], expected: 1 },
      { label: "Задачи до FCP и после TTI не считаются", args: [[{ start: 10, duration: 200 }, { start: 500, duration: 300 }, { start: 1500, duration: 400 }], 100, 1200], expected: 250 },
      { label: "Границы окна: старт в FCP считается, в TTI — нет", args: [[{ start: 100, duration: 80 }, { start: 900, duration: 80 }], 100, 900], expected: 30 },
      { label: "Несколько длинных задач", args: [[{ start: 120, duration: 90 }, { start: 400, duration: 250 }, { start: 800, duration: 75 }], 100, 2000], expected: 265 },
    ],
    hints: [
      "Блокирующая часть одной задачи: Math.max(0, task.duration - 50).",
      "Окно: учитывайте задачу, только если task.start >= fcp && task.start < tti.",
      "Коротко: tasks.filter(t => t.start >= fcp && t.start < tti).reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0).",
    ],
    takeaway: "Вы посчитали метрику отзывчивости по данным профайлера и учли границы окна измерения.",
    solution: `interface LongTask { start: number; duration: number }

function totalBlockingTime(tasks: LongTask[], fcp: number, tti: number): number {
  return tasks
    .filter((task) => task.start >= fcp && task.start < tti)
    .reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0);
}
`,
  },

  EV_015: {
    kind: "ts",
    title: "Смоделируйте debounce поиска",
    brief: "Поиск по истории платежей отправляет запрос на каждое нажатие клавиши. Смоделируйте debounce на данных: debounceFires(times, wait) получает моменты нажатий в мс по возрастанию и возвращает моменты, когда уйдут запросы. Каждое нажатие перезапускает таймер на wait мс; запрос уходит, если за wait мс не было нового нажатия. Нажатие ровно в момент срабатывания таймера его уже не отменяет.",
    functionName: "debounceFires",
    example: {
      call: "debounceFires([0, 100, 200, 1000], 300)",
      result: "[500, 1300]",
      note: "Серия 0–200 даёт один запрос через 300 мс после последнего нажатия, нажатие в 1000 — второй.",
    },
    starter: `function debounceFires(times: number[], wait: number): number[] {
  const fires: number[] = [];
  // Для каждого нажатия решите: успеет ли таймер сработать до следующего?
  return fires;
}
`,
    tests: [
      { label: "Пример из условия", args: [[0, 100, 200, 1000], 300], expected: [500, 1300] },
      { label: "Нет нажатий", args: [[], 300], expected: [] },
      { label: "Одно нажатие", args: [[50], 200], expected: [250] },
      { label: "Пауза ровно wait — два запроса", args: [[0, 300], 300], expected: [300, 600] },
      { label: "Быстрая серия — один запрос", args: [[0, 50, 100, 150, 200, 250], 100], expected: [350] },
      { label: "Редкие нажатия — запрос на каждое", args: [[0, 500, 1000], 100], expected: [100, 600, 1100] },
    ],
    hints: [
      "Таймер нажатия i сработает в момент times[i] + wait, если следующее нажатие не придёт раньше.",
      "Условие срабатывания: это последнее нажатие или times[i + 1] >= times[i] + wait.",
      "for (let i = 0; i < times.length; i++) { const fire = times[i] + wait; if (i === times.length - 1 || times[i + 1] >= fire) fires.push(fire); }",
    ],
    takeaway: "Вы разобрали, как debounce сокращает число запросов и где проходит граница срабатывания таймера.",
    solution: `function debounceFires(times: number[], wait: number): number[] {
  return times
    .map((time, i) => ({ fire: time + wait, next: times[i + 1] }))
    .filter(({ fire, next }) => next === undefined || next >= fire)
    .map(({ fire }) => fire);
}
`,
  },

  EV_016: {
    kind: "quiz",
    title: "Сделайте интерфейс доступным",
    brief: "Три фрагмента интерфейса интернет-банка. Найдите решение, которое работает для скринридера, клавиатуры и людей с нарушениями цветовосприятия.",
    takeaway: "Вы проверили доступное имя кнопки, передачу ошибок не только цветом и контраст текста по WCAG.",
    questions: [
      {
        prompt: "Кнопка «Перевести» сделана как иконка стрелки без текста. Как сделать её доступной для скринридера?",
        options: [
          "Оставить только иконку — зрячим пользователям всё понятно",
          "Сделать <div onclick> с иконкой и title",
          "Использовать <button> и дать ему доступное имя: aria-label=\"Перевести\" или визуально скрытый текст",
        ],
        correct: 2,
        explanation: "Нативная кнопка фокусируется с клавиатуры и объявляется как кнопка, а доступное имя сообщает, что она делает. <div> без роли и обработки клавиш недоступен с клавиатуры.",
        hint: "Как скринридер узнает, что это кнопка и что она делает?",
      },
      {
        prompt: "Ошибка в поле суммы показана только красной рамкой. Что не так?",
        options: [
          "Информация передаётся только цветом: нужен текст ошибки рядом с полем, связанный с ним через aria-describedby",
          "Всё в порядке, красный цвет понятен всем",
          "Рамку нужно сделать толще и ярче",
        ],
        correct: 0,
        explanation: "Люди с нарушениями цветовосприятия и пользователи скринридеров не получат сигнал, переданный только цветом. Текст ошибки, связанный с полем, объявляется при фокусе.",
        hint: "Как ошибку заметит человек, который не различает красный?",
      },
      {
        prompt: "Основной текст набран серым #999999 на белом фоне. Проходит ли это WCAG 2.1 уровня AA?",
        options: [
          "Да, если размер шрифта больше 12px",
          "Нет: контраст около 2,8:1, а для обычного текста нужно не меньше 4,5:1",
          "Контраст текста в WCAG не нормируется",
        ],
        correct: 1,
        explanation: "WCAG AA требует контраст 4,5:1 для обычного текста и 3:1 для крупного. Серый #999999 на белом даёт около 2,85:1.",
        hint: "Вспомните минимальное соотношение контраста для обычного текста на уровне AA.",
      },
    ],
  },

  EV_017: {
    kind: "ts",
    title: "Напишите reducer фильтров истории операций",
    brief: "Экран истории операций хранит фильтры в useReducer. Напишите чистую функцию filtersReducer(state, action). setQuery — новая строка поиска; toggleCategory — добавить категорию в конец списка или убрать, если она уже выбрана; nextPage — page + 1; reset — начальное состояние. setQuery и toggleCategory сбрасывают page на 1. Исходный state менять нельзя; неизвестное действие возвращает state без изменений.",
    functionName: "filtersReducer",
    example: {
      call: "filtersReducer({ query: \"\", categories: [\"кафе\"], page: 3 }, { type: \"toggleCategory\", category: \"такси\" })",
      result: "{ query: \"\", categories: [\"кафе\", \"такси\"], page: 1 }",
      note: "Новая категория добавлена в конец, страница сброшена, исходный объект не изменён.",
    },
    starter: `interface FiltersState { query: string; categories: string[]; page: number }
type FiltersAction =
  | { type: "setQuery"; query: string }
  | { type: "toggleCategory"; category: string }
  | { type: "nextPage" }
  | { type: "reset" };

const initialState: FiltersState = { query: "", categories: [], page: 1 };

function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    // Добавьте case для каждого действия
    default:
      return state;
  }
}
`,
    tests: [
      { label: "setQuery сбрасывает страницу", args: [{ query: "", categories: [], page: 4 }, { type: "setQuery", query: "такси" }], expected: { query: "такси", categories: [], page: 1 }, pure: true },
      { label: "toggleCategory добавляет в конец, не мутируя state", args: [{ query: "", categories: ["кафе"], page: 3 }, { type: "toggleCategory", category: "такси" }], expected: { query: "", categories: ["кафе", "такси"], page: 1 }, pure: true },
      { label: "toggleCategory убирает выбранную категорию", args: [{ query: "кофе", categories: ["кафе", "такси"], page: 2 }, { type: "toggleCategory", category: "кафе" }], expected: { query: "кофе", categories: ["такси"], page: 1 }, pure: true },
      { label: "nextPage листает дальше", args: [{ query: "", categories: ["кафе"], page: 1 }, { type: "nextPage" }], expected: { query: "", categories: ["кафе"], page: 2 }, pure: true },
      { label: "reset возвращает начальное состояние", args: [{ query: "аренда", categories: ["кафе"], page: 5 }, { type: "reset" }], expected: { query: "", categories: [], page: 1 }, pure: true },
      { label: "Неизвестное действие ничего не меняет", args: [{ query: "а", categories: [], page: 2 }, { type: "refresh" }], expected: { query: "а", categories: [], page: 2 }, pure: true },
    ],
    hints: [
      "Каждый case возвращает новый объект, например: case \"setQuery\": return { ...state, query: action.query, page: 1 };",
      "toggleCategory: если state.categories.includes(action.category) — отфильтруйте её, иначе [...state.categories, action.category]. push мутирует исходный массив.",
      "Осталось: nextPage — { ...state, page: state.page + 1 }, reset — initialState, default — сам state.",
    ],
    takeaway: "Вы написали чистый reducer: новое состояние без мутаций, предсказуемые переходы и безопасный default.",
    solution: `interface FiltersState { query: string; categories: string[]; page: number }
type FiltersAction =
  | { type: "setQuery"; query: string }
  | { type: "toggleCategory"; category: string }
  | { type: "nextPage" }
  | { type: "reset" };

const initialState: FiltersState = { query: "", categories: [], page: 1 };

function filtersReducer(state: FiltersState, action: FiltersAction): FiltersState {
  switch (action.type) {
    case "setQuery":
      return { ...state, page: 1, query: action.query };
    case "toggleCategory": {
      const selected = state.categories.includes(action.category);
      const categories = selected
        ? state.categories.filter((category) => category !== action.category)
        : [...state.categories, action.category];
      return { ...state, categories, page: 1 };
    }
    case "nextPage":
      return { ...state, page: state.page + 1 };
    case "reset":
      return initialState;
    default:
      return state;
  }
}
`,
  },
};
