// Единая точка вызова LLM. Провайдер — LLM_PROVIDER (по умолчанию mock).
// Реальный провайдер подключается здесь, когда появится ключ; остальной код не меняется.

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
}

type Provider = (req: LlmRequest) => Promise<string>;

/** Мок: детерминированно возвращает последнее сообщение пользователя — объяснение из шаблона не искажается. */
const mock: Provider = async (req) => {
  const last = [...req.messages].reverse().find((m) => m.role === "user");
  return last?.content ?? "";
};

const providers: Record<string, Provider> = { mock };

export function llmProvider(): string {
  const name = process.env.LLM_PROVIDER ?? "mock";
  return name in providers ? name : "mock";
}

export async function complete(req: LlmRequest): Promise<string> {
  return providers[llmProvider()](req);
}
