// Серверная точка вызова LLM. OPENAI_API_KEY включает OpenAI;
// LLM_PROVIDER=mock явно оставляет офлайн-режим. Ключ не передаётся в UI.

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  responseSchema?: Record<string, unknown>;
}

type Provider = (req: LlmRequest) => Promise<string>;

/** Мок: детерминированно возвращает последнее сообщение пользователя — объяснение из шаблона не искажается. */
const mock: Provider = async (req) => {
  const last = [...req.messages].reverse().find((m) => m.role === "user");
  return last?.content ?? "";
};

const openai: Provider = async (req) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("Не задан OPENAI_API_KEY на сервере.");

  let response: Response;
  let data: {
    status?: string;
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-6-sol",
        instructions: req.system,
        input: req.messages,
        ...(req.responseSchema ? {
          text: { format: { type: "json_schema", name: "career_mentor_reply", strict: true, schema: req.responseSchema } },
        } : {}),
        reasoning: { effort: "none" },
        max_output_tokens: 1800,
        store: false,
      }),
      signal: AbortSignal.timeout(8500),
      cache: "no-store",
    });
    // Тело ошибки провайдера не выводим: оно может содержать части запроса.
    if (!response.ok) {
      const reason = response.status === 401 ? "проверьте API-ключ"
        : response.status === 429 ? "проверьте баланс и лимиты API"
          : response.status === 403 || response.status === 404 ? "проверьте доступ к модели"
            : "сервис не смог обработать запрос";
      throw new Error(`OpenAI HTTP ${response.status}: ${reason}.`);
    }
    data = await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("OpenAI HTTP ")) throw error;
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("OpenAI не ответил за 8,5 секунды.");
    }
    throw new Error("Не удалось получить ответ OpenAI.");
  }
  if (data.status !== "completed") throw new Error("OpenAI не завершил ответ.");
  const text = data.output?.filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "").join("\n").trim();
  if (!text) throw new Error("OpenAI вернул пустой ответ.");
  return text;
};

const providers: Record<string, Provider> = { mock, openai };

export function llmProvider(): string {
  return process.env.LLM_PROVIDER?.trim() || (process.env.OPENAI_API_KEY?.trim() ? "openai" : "mock");
}

export async function complete(req: LlmRequest): Promise<string> {
  const name = llmProvider();
  if (!Object.hasOwn(providers, name)) throw new Error("Неизвестный LLM_PROVIDER. Используйте openai или mock.");
  return providers[name](req);
}
