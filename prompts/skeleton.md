# Задача: скелет Career Quest «Город карьеры»

Ты строишь каркас, на котором дальше параллельно работают 5–8 агентов. Твоя цель — не фичи, а **рамка**: всё запускается, все эндпоинты отвечают по контракту (пусть наивно), по городу можно ходить, у каждой будущей фичи есть своё место и точка регистрации в одну строку.

Сначала прочитай: `CLAUDE.md`, `docs/VISION.md` (цели и устройство города), `docs/DECISIONS.md` (контракт типов и API), `docs/DEMO.md`. Больше ничего не исследуй.

Порт: 3000. Ветка: `skeleton`. Два коммита — S1 и S2, каждый до ~30 минут. После S1 запушь, потом делай S2.

---

## S1 — приложение, данные, контракт, заглушки API

1. **Next.js** (App Router, TypeScript, Tailwind, ESLint, `src/`, алиас `@/*`, npm).
   - В корне уже лежат `CLAUDE.md`, `docs/`, `scripts/`, `prompts/`, `.claude/`, поэтому `create-next-app` может отказаться работать в непустой папке. Тогда создай во временной папке и перенеси файлы, ничего существующего не затирая.
   - Скрипты: `typecheck` = `tsc --noEmit`, `lint` = eslint по `src`. `./scripts/check.sh` уже вызывает оба.
2. **shadcn/ui:** init + компоненты `button card badge progress sheet dialog tabs select scroll-area separator tooltip sonner`.
3. **Зависимости сразу, чтобы потом не трогать package.json:** `three @react-three/fiber @react-three/drei`, dev: `@types/three`. Они уже записаны в DECISIONS. Больше ничего не добавляй.
4. **Данные.** Распакуй `career_quest_dataset.zip` (в шаблоне лежит в `~/Hackathon/Варианты/карьера/`; если его нет — остановись и спроси путь) в `data/`: только `employees.json`, `events.json`, `skills.json`, `activity_history.csv`, без `__MACOSX`. `data/` коммитим.
5. **`src/lib/types.ts`** — типы датасета (Employee, DevEvent, Skill, RoleProfile, HistoryRecord — поля как в README кита) + весь контракт из DECISIONS (`Profile`, `Gap`, `Factor`, `Recommendation`, `ProgressDelta`, `AgentStep`, ответы API) + типы мира:
   - `EventType` — 7 типов;
   - `Department` — 8 отделов;
   - `Place = { kind: 'office'; department } | { kind: 'venue'; eventType } | { kind: 'mentor' } | { kind: 'home'; id } | { kind: 'soon'; id }`.
6. **`src/lib/store.ts`** — серверный store в памяти.
   - Синглтон в `globalThis`, чтобы переживать HMR. Грузит `data/` через `process.cwd()`, CSV парсить руками без библиотеки.
   - Функции: `getEmployees`, `getEmployee`, `getEvents`, `getSkills`, `getRoleProfile(role, grade)`, `getHistory(employeeId)`, `addHistory(record)`, `upsertEmployees(list)`, `appendHistory(list)`.
   - Константа `AS_OF = '2026-10-01'`.
7. **`src/lib/llm.ts`** — интерфейс `complete({ system, messages }) → Promise<string>` и провайдер `mock` (детерминированный текст). Выбор через `LLM_PROVIDER`, по умолчанию `mock`. Реальные провайдеры не делай.
8. **`src/lib/sse.ts`** — сервер: `sseStream(asyncIterable<AgentStep>) → Response`. Клиент: `readSse(response, onStep)` на fetch + ReadableStream (POST, поэтому не EventSource).
9. **`src/lib/world.ts`** — чистые данные и функции мира без React:
   - `PLACES` — все места статичного города с координатами:
     - 8 башен отделов в деловом квартале;
     - 7 площадок по типам активностей (таблица в VISION);
     - юрта наставника на центральной площади;
     - 4–6 домов на окраине;
     - 3 пустых бизнес-центра «Скоро».
   - `placeName(place)` — русское название («Башня Backend Development», «Академия», «ЦОН»…).
   - `venueForEvent(event) → Place` — по `event.type`.
   - `gradeFloor(grade) → 0..3`.
   - `spawnFor(employee) → [x, z]` — дверь своей башни для `office`/`hybrid`, дом на окраине для `remote` (дом выбирается стабильно по id).
10. **Заглушки engine** в `src/features/engine/` — наивно, но строго по контракту. Настоящую логику сделает фича engine.
    - `getProfile(id)`: сырые навыки без доначисления после ревью, цель = `career_goal` или следующий грейд, gaps, gradeProgress.
    - `recommend(id)`: фильтр по роли, грейду, не mandatory, не completed; score = сумма закрываемого разрыва; 3 фактора-заготовки; `explanation` — шаблон из факторов.
    - `completeActivity(id, eventId)`: добавить запись `completed` с датой `AS_OF` и вернуть `ProgressDelta`.
11. **API** — все роуты из DECISIONS, тонкие файлы в `src/app/api/**/route.ts`, которые реэкспортируют хендлеры из `src/features/<фича>/api.ts`:
    - `employees`, `events`, `profile/[id]`, `recommend/[id]`, `progress` (engine);
    - `mentor` (mentor): мок-стрим — thought → tool_call `get_profile` → tool_result → tool_call `recommend` → tool_result → final. Между шагами пауза ~400 мс, чтобы стрим был виден;
    - `hr` (hr): пустые массивы нужной формы;
    - `upload` (upload): принимает multipart, пока отвечает `{ employees: 0, history: 0 }`.

**Готово S1:**
- `curl localhost:3000/api/profile/E0028` → Profile;
- `curl -N -X POST localhost:3000/api/mentor -d '{"employeeId":"E0028"}'` → стрим шагов;
- `./scripts/check.sh` зелёный.

Коммит `skeleton: app, data, contract, api stubs`, пуш.

---

## S2 — оболочка города и HUD

Цель: персонаж выбранного сотрудника ходит по общему городу, подходит к месту и открывает его панель. Всё на примитивах, без моделей.

1. **Клиентский стор** `src/lib/client-store.ts` на `useSyncExternalStore`, без zustand. Контекст React не всегда проходит внутрь `<Canvas>`, поэтому не контекст.
   - Состояние: `employeeId` (по умолчанию `E0028`), `profile`, `recommendations`, `acceptedQuests`, `openPanel: { panel: PanelId; place?: Place } | null`, `nearPlace`, `lastDelta: ProgressDelta | null`, `moveTarget`.
   - Экшены: `selectEmployee`, `openPanel`, `closePanel`, `setRecommendations`, `acceptQuest`, `dropQuest`, `applyDelta`.
   - Загрузка профиля — fetch `/api/profile/[id]` при смене сотрудника. Смена сотрудника телепортирует персонажа в `spawnFor`.
2. **Сцена** `src/features/city/`. Главная `src/app/page.tsx` — полноэкранный `<Canvas>` через `dynamic(..., { ssr: false })` + HUD поверх.
   - `Ground` — трава, дороги между кварталами, площадь.
   - `Place` рендерит по `kind`, всё примитивами:
     - **Башня отдела:** 4 этажа из поставленных друг на друга коробок, у каждого отдела свой цвет. Для отдела текущего сотрудника этаж его грейда светится, над следующим этажом — тонкая полоска прогресса из `profile.gradeProgress`.
     - **Площадки** — узнаваемые силуэты: Академия с колоннами, Мастерские с трубой, Кофейня с навесом, Экзаменационный центр, Амфитеатр полукругом, Вокзал с платформой, ЦОН.
     - **Юрта** — цилиндр + конус. **Дома** — маленькие коробки с крышей. **«Скоро»** — серые коробки.
     - Подпись через drei `<Html>`: название места.
   - `models.ts` — реестр `тип места → путь к GLB | null`. Сейчас все `null`, рисуются примитивы. Фича city-assets потом заполнит пути.
   - `Player` — капсула, цвет по грейду. WASD / стрелки + клик по земле (raycast) → идёт к точке. Коллизия — не заходит в круг радиуса места.
   - `CameraRig` — камера сверху под углом ~55°, следует за игроком с lerp, колесо — зум в пределах.
   - Близость: ближайшее место в радиусе → `nearPlace`. E / Enter открывает панель места, Esc закрывает. Клик по месту = идти к нему и открыть. C — лист персонажа, J — журнал квестов.
   - Свет: hemisphere + directional с тенями, `ContactShadows`, лёгкий `fog`.
   - `extras.ts` — массив компонентов, которые рендерятся внутри Canvas. Сейчас пустой; пасхалки, NPC и маркеры добавляются по одной строке.
3. **HUD** `src/features/hud/` поверх Canvas, shadcn:
   - Верхняя панель: выбор сотрудника (Select по `/api/employees`, подпись «имя · роль · грейд»), кнопки быстрого перемещения (своя башня, юрта, все площадки), кнопки «Персонаж (C)», «Квесты (J)», ссылка «HR» на `/hr`.
   - Подсказка внизу: «E — войти: <название>», когда `nearPlace` задан.
   - Правая `Sheet` рендерит панель из реестра `src/panels.ts` по `openPanel`.
4. **Реестр панелей** `src/panels.ts`: `PanelId = 'character' | 'quests' | 'mentor' | 'office' | 'venue' | 'soon'` → компонент, получает `place`. Сейчас каждая — заглушка из `src/features/<фича>/Panel.tsx`:
   - `mentor` уже читает мок-стрим `/api/mentor` через `readSse` и показывает шаги списком — это проверка, что стрим доходит до UI;
   - `character` показывает навыки: уровень / требование цели;
   - `venue` показывает активности этого типа из `/api/events`;
   - `office` — название отдела и прогресс этажа;
   - `quests` — пустой журнал;
   - `soon` — «Здесь появится ваша компания».
   
   Дом открывает `character`.
5. **`src/app/hr/page.tsx`** — реэкспорт заглушки `src/features/hr/Page.tsx`.
6. **`src/nav.ts`** — список HUD-ссылок (город, HR); фичи добавляют по строке.

**Готово S2:**
- `npm run dev` → город: 8 башен, 7 площадок, юрта, дома, «Скоро»; капсула ходит WASD и кликом, камера следует.
- E0028 появляется у башни Backend Development, светится 2-й этаж (Middle).
- Смена в HUD на remote-сотрудника переносит персонажа к дому на окраине. Смена на Sales Manager — к башне Sales.
- Подошёл к юрте → E → панель, в ней по шагам приходит мок-стрим.
- Подошёл к Академии → E → список курсов.
- C открывает лист персонажа. `/hr` открывается.
- `./scripts/check.sh` зелёный.
- Покажи скриншот города.

Коммит `skeleton: city shell and hud`, пуш.

---

## Не делай
Настоящую логику рекомендаций, реальный LLM, GLB-модели, NPC, маркеры квестов, «+1», лифт, пасхалки, содержимое HR, UI загрузки, README, тесты. Это всё отдельные фичи, для каждой ты оставляешь место.

## В конце ответа
Три строки по CLAUDE.md и список точек регистрации — файл и что добавляет фича одной строкой. По нему будем резать на фичи.
