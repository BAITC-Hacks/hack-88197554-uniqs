<p align="center">
  <img src="docs/assets/banner.svg" alt="Career Quest · Город карьеры: башни компаний и юрта AI-наставника" width="100%">
</p>

<p align="center">
  <img alt="HackAlem AI" src="https://img.shields.io/badge/HackAlem_AI-трек_Halyk_Bank-00805f?style=for-the-badge">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="three.js" src="https://img.shields.io/badge/three.js-R3F-222222?style=for-the-badge&logo=threedotjs&logoColor=white">
</p>

<h3 align="center">Карьера как город: этажи башен — грейды, AI-наставник в юрте объясняет каждый следующий шаг.</h3>

Сотрудник ходит по 3D-городу. У каждого отдела своя башня с вывеской компании: Halyk Bank, Freedom, OpenAI, Kolesa Group и другие. Этаж башни — грейд. AI-наставник по профилю, истории участия и требованиям следующего грейда подбирает 1–3 активности и объясняет выбор минимум по трём факторам. Практическое задание к активности приходит от одной из компаний города. После выполнения растут навыки и прогресс к следующему этажу. HR видит, какие компетенции проседают и у кого нет следующего шага, без публичных рейтингов.

## Запуск

Нужен Node.js 20+.

```bash
git clone https://github.com/BAITC-Hacks/hack-88197554-uniqs.git
cd hack-88197554-uniqs
npm install
npm run dev
```

Откройте http://localhost:3000.

**Данные.** Датасет стартового кита в git не хранится. Положите `employees.json`, `events.json`, `skills.json`, `activity_history.csv` в `data/` или задайте `DATASET_ZIP=/путь/к/career_quest_dataset.zip`: `npm run dev` распакует архив сам.

**AI-наставник.** Без ключа работает офлайн-режим: объяснение собирается шаблоном из тех же факторов. Чтобы подключить OpenAI, создайте `.env.local`:

```bash
OPENAI_API_KEY=sk-...
# OPENAI_MODEL=...     модель, если нужна не та, что по умолчанию
# LLM_PROVIDER=mock    принудительно офлайн-режим
```

## Что посмотреть

| Адрес | Что там |
|---|---|
| `/` | Город карьеры: лобби с выбором сотрудника и цели, тур наставника, башни, площадки обучения, юрта |
| `/hr` | HR-обзор: проседающие навыки по отделам, сотрудники без следующего шага, участие |
| `/upload` | Загрузка своих профилей (`employees.json`) и истории (`activity_history.csv`) в том же формате |

Герой демо — **E0028** (Backend Engineer, Middle → Senior). Сценарий на 3 минуты: [docs/DEMO.md](docs/DEMO.md).

**Управление в городе:** WASD — ходить · E или Enter — войти · C — профиль · J — мой план · Esc — закрыть панель. Карта и чат с наставником — в верхней панели.

## Разработка

```bash
./scripts/check.sh   # typecheck + lint
```

- [docs/VISION.md](docs/VISION.md) — цели и приоритеты P0–P3
- [docs/DECISIONS.md](docs/DECISIONS.md) — контракт между фичами и принятые решения
- [prototypes/office](prototypes/office/README.md) — отдельный прототип офиса с совместным присутствием
