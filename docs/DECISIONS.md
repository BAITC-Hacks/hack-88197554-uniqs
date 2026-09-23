# Решения (append-only)

Формат: `дата — кто — что — почему`

- 2026-09-23 — команда — Трек «Карьера», кейс Career Quest (Halyk). — Чистые данные, задача по сути агентная, реальный заказчик. Аким проще, но у всех будет одинаковый движок. Логистика — грязные реальные данные, агентности мало.
- 2026-09-23 — команда — Стек Next.js (App Router) + TS + Tailwind + shadcn/ui, данные в памяти, без БД. — ТЗ требует запуск одной командой, фронт и API в одном процессе.
- 2026-09-23 — команда — LLM: ключа пока нет, по умолчанию мок. Объяснение сначала собирается шаблоном из факторов, LLM только переписывает его человеческим языком и новые факторы не придумывает. — Демо не зависит от ключа и сети, объяснимость проверяема.
- 2026-09-23 — команда — Ядро и скин разделены: скин рисует только `Profile` и `ProgressDelta`. — Сюжет можно выбрать позже, никого не блокирует.
- 2026-09-23 — команда — Сюжет скина: «Город карьеры» («строить карьеру»). Участок = навык, стадия постройки = уровень, строительные леса = требование цели, критичные навыки — в центре. Рекомендация = «!» над участком, «Не сейчас» = «стройка отложена», все требования закрыты = «город получил статус <грейд>». — HR считывает метафору без объяснений, шкала 0–5 ложится на стадии.
- 2026-09-23 — команда — Графика: уютный пиксель-арт вид сверху 3/4, как в Stardew Valley (не изометрия). Спрайты Stardew и Habbo только как референс, чужие ассеты не берём. Спрайты — CC0-пак (Kenney) или сгенерированные: 1 тип здания × 4 стадии + фон + маркер «!». Рендер — CSS-сетка + `<img>` с `image-rendering: pixelated`, без новых зависимостей. Город — одна панель, цифры и объяснения рядом, в обычном UI. Стоп-критерий: если к T+2ч ассеты не выглядят, вместо города показываем полоски. — Уровень детализации с референсов за 5 часов не нарисовать, поэтому упрощаем до стадий, а не этажей.
- 2026-09-23 — команда — **Заменяет запись о пиксель-арте.** Город — стилизованный low-poly 3D (референс — видео «Игра с GPT-6 Astra за 24 часа», Brawl Stars): персонаж ходит WASD и кликом, камера сверху под углом следует за ним. Здания = категории навыков (таблица в VISION) + 4 функциональных (дом, юрта наставника, ратуша, доска). Стадия 0–4 = заполненность требований цели в категории. Панели зданий = экраны продукта. HR — отдельный 2D-дашборд. — Качество «как в игре» дешевле получить из CC0 low-poly моделей, чем рисовать пиксель-арт.
- 2026-09-23 — команда — Новые зависимости: `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`. Ставит скелет, дальше package.json заморожен. Без физики и без state-библиотек: клиентское состояние на `useSyncExternalStore`, потому что контекст React не всегда проходит в `<Canvas>`. — Минимум, без которого 3D-сцены нет.
- 2026-09-23 — команда — Модели только CC0 одного семейства (Kenney / KayKit / Quaternius), чужие игровые ассеты не берём. Пока моделей нет — примитивы, подмена через `models.ts`. — Сцена работает с первой минуты, стиль не разъезжается.
- 2026-09-23 — команда — Весь P0 доступен и без 3D: HUD открывает те же панели. Стоп-критерии для города — в VISION. — Демо не зависит от самого рискованного куска.
- 2026-09-23 — команда — **Заменяет «личный город» и «здания = категории навыков».** Город один и общий, статичный. 8 офисных башен = 8 отделов («компании» города), этажи = грейды (карьерная лестница). Площадки обучения по типам активностей (Академия, Мастерские, Кофейня наставников, Экзаменационный центр, Амфитеатр, Вокзал, ЦОН), юрта наставника в центре, дома для remote, бизнес-центры «Скоро» под другие компании. Персонаж = выбранный сотрудник, навыки — в листе персонажа. Другие люди — безликие NPC. — Одна сцена для всех проще в сборке, «карьерная лестница» понятна HR, «много компаний» даёт историю про масштабирование.

## Контракт между фичами (меняется только через эту запись)

```ts
// src/lib/types.ts — поля датасета как в README стартового кита
type SkillId = string;
type Target = { role: string; grade: 'Junior' | 'Middle' | 'Senior' | 'Lead'; source: 'goal' | 'next_grade' };
type Gap = { skillId: SkillId; current: number; required: number; critical: boolean };
type Profile = {
  employee: Employee;                           // как в employees.json
  target: Target | null;                        // null — Lead без цели
  effectiveSkills: Record<SkillId, number>;     // с учётом completed после last_review_date
  reviewBumps: { skillId: SkillId; from: number; to: number; eventId: string }[];
  gaps: Gap[];
  gradeProgress: { met: number; total: number; criticalMet: number; criticalTotal: number };
  history: HistoryRecord[];                     // как в activity_history.csv
};
type Factor = {
  kind: 'critical_gap' | 'gap' | 'goal' | 'history' | 'format' | 'prereq' | 'session';
  text: string;       // короткий чип: «System Design 3 → 4, критичен для Senior»
  weight: number;     // вклад в score, со знаком
};
type Recommendation = {
  eventId: string; title: string; score: number;
  factors: Factor[];               // минимум 3
  nextSession: string | null;      // null — self_paced
  explanation: string;             // шаблон из factors, LLM может переписать
};
type ProgressDelta = {
  employeeId: string; eventId: string;
  skills: { skillId: SkillId; from: number; to: number; required: number; critical: boolean }[];
  gradeProgress: { before: Profile['gradeProgress']; after: Profile['gradeProgress'] };
  gradeReady: boolean;             // все требования цели закрыты
};
type AgentStep =
  | { type: 'thought'; text: string }
  | { type: 'tool_call'; tool: string; input: unknown }
  | { type: 'tool_result'; tool: string; output: unknown }
  | { type: 'tool_error'; tool: string; error: string }
  | { type: 'final'; recommendations: Recommendation[] };
```

API:
- `GET /api/employees` → `Employee[]` (список)
- `GET /api/events` → `DevEvent[]` (каталог, для панелей площадок)
- `GET /api/profile/[id]` → `Profile`
- `GET /api/recommend/[id]` → `Recommendation[]` (без LLM, детерминированно)
- `POST /api/mentor` `{ employeeId }` → SSE-поток `AgentStep`
- `POST /api/progress` `{ employeeId, eventId, status: 'completed' | 'declined' }` → `ProgressDelta` (для `declined` — пустые skills)
- `POST /api/upload` (multipart: employees.json и/или activity_history.csv) → `{ employees: number; history: number }`
- `GET /api/hr` → `{ weakSkills: {department, skillId, shareBelow}[]; noStep: {employeeId, reason}[]; participation: {eventId, completed, no_show, declined, dropped}[] }`
