// POST /api/intro/chat — гид по продукту. LLM, а в моке или при ошибке — ответ по ключевым словам.
import { complete, llmProvider, type LlmMessage } from "@/lib/llm";
import { RULES, STEPS } from "./content";

const SYSTEM = [
  "Ты гид по продукту Career Quest. Отвечай кратко по-русски, 2–4 предложения, только о продукте.",
  "Если вопрос не про Career Quest, вежливо верни разговор к продукту.",
  "",
  "Описание продукта:",
  ...STEPS.map((s) => `- ${s.title}: ${s.text}`),
  "",
  "Как наставник подбирает шаги:",
  ...RULES.map((r) => `- ${r}`),
].join("\n");

interface Topic {
  keys: string[];
  answer: string;
}

const step = (id: string) => STEPS.find((s) => s.id === id)?.text ?? "";

const TOPICS: Topic[] = [
  {
    keys: ["наставн", "юрт", "выбира", "подбира", "почему", "фактор", "объясн", "рекоменд"],
    answer: `${step("mentor")} Он учитывает цель, ключевые навыки роли, пользу активности и то, как сотрудник раньше участвовал: неявки и отказы по похожему формату — сигнал против. Обязательные, уже пройденные и чужие по роли активности он не предлагает, а каждый выбор объясняет минимум по трём факторам.`,
  },
  {
    keys: ["этаж", "башн", "грейд", "лестниц", "отдел", "компани", "повышен"],
    answer: `${step("city")} Чем выше этаж, тем старше грейд; ваш персонаж стоит на своём этаже, а следующий этаж — ближайшая цель. Требования к этажу берутся из профиля роли, и ключевые навыки важнее всего для перехода.`,
  },
  {
    keys: ["hr", "эйчар", "дашборд", "команд", "руковод", "рейтинг", "срез"],
    answer: `${step("hr")} HR видит, какие навыки проседают у команд и как идёт участие, чтобы планировать обучение. Персональных таблиц лидеров нет — участие остаётся добровольным.`,
  },
  {
    keys: ["площадк", "курс", "ментор", "клуб", "задани", "openai", "freedom", "kolesa", "epam", "astana", "halyk", "chocofamily", "indrive", "обучен", "активност"],
    answer: `${step("venues")} Каждая площадка — отдельный тип активности; наставник подсказывает, какая из них закроет ваш разрыв в навыках быстрее всего.`,
  },
  {
    keys: ["прогресс", "выполн", "не сейчас", "доброволь", "обязател", "очк", "навык", "разрыв"],
    answer: `${step("progress")} Навыки считаются на дату последнего ревью плюс всё, что завершено после него, но не выше максимума активности. За обязательные активности очков нет.`,
  },
  {
    keys: ["загруз", "upload", "свои", "своих", "формат", "csv", "json", "данн"],
    answer: `${step("upload")} Все расчёты идут из загруженных данных, а не из заранее зашитых сотрудников, поэтому жюри может проверить продукт на своих профилях.`,
  },
  {
    keys: ["город", "3d", "карт", "персонаж", "герой", "ходить"],
    answer: `${step("city")} Персонаж — это выбранный сотрудник: он ходит по городу, а панели мест открывают экраны продукта — башни, площадки и юрту наставника.`,
  },
  {
    keys: ["что это", "career quest", "продукт", "зачем", "для чего", "halyk", "халык"],
    answer: `${step("about")} Всё происходит в «Городе карьеры»: башни отделов, площадки обучения и юрта наставника.`,
  },
];

const DEFAULT_ANSWER = `${step("about")} Спросите про наставника, этажи башен, площадки обучения, прогресс или HR-срез — расскажу подробнее.`;

/** Локальный ответ по ключевым словам: чат никогда не молчит. */
export function fallbackReply(question: string): string {
  const q = question.toLowerCase();
  let best: Topic | null = null;
  let score = 0;
  for (const t of TOPICS) {
    const s = t.keys.filter((k) => q.includes(k)).length;
    if (s > score) { best = t; score = s; }
  }
  return best?.answer ?? DEFAULT_ANSWER;
}

function readMessages(body: unknown): LlmMessage[] {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is LlmMessage =>
      !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 1000) }))
    .slice(-12);
}

export async function postIntroChat(req: Request): Promise<Response> {
  const messages = readMessages(await req.json().catch(() => null));
  const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!question) return Response.json({ reply: DEFAULT_ANSWER, source: "fallback" });

  if (llmProvider() !== "mock") {
    try {
      const reply = (await complete({ system: SYSTEM, messages })).trim();
      if (reply) return Response.json({ reply, source: "llm" });
    } catch {
      // падение LLM не ломает чат — ниже локальный ответ
    }
  }
  return Response.json({ reply: fallbackReply(question), source: "fallback" });
}
