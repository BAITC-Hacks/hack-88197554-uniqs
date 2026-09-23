import type { LlmMessage } from "@/lib/llm";
import type { AgentStep, Recommendation } from "@/lib/types";

export type MentorFinal = {
  type: "final";
  recommendations: Recommendation[];
  message: string;
  mode: "openai" | "offline" | "fallback";
};

export type MentorStep = Exclude<AgentStep, { type: "final" }> | MentorFinal;

export interface ChatMessage extends LlmMessage {
  id: string;
  recommendations?: Recommendation[];
  mode?: MentorFinal["mode"];
  steps?: AgentStep[];
}

export function parseMessages(value: unknown): LlmMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 12) return null;
  const messages: LlmMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || !("role" in item) || !("content" in item)
      || (item.role !== "user" && item.role !== "assistant")
      || typeof item.content !== "string" || !item.content.trim() || item.content.length > 4000) return null;
    messages.push({ role: item.role, content: item.content.trim() });
  }
  if (messages.length && messages.at(-1)?.role !== "user") return null;
  return messages;
}
