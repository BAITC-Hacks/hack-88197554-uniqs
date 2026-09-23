"use client";

import { Bot, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { QUICK_QUESTIONS } from "./content";

interface Msg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export function IntroChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, typing]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || typing) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(history);
    setInput("");
    setTyping(true);
    try {
      const res = await fetch("/api/intro/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok) throw new Error(`сервер ответил ${res.status}`);
      const data = (await res.json()) as { reply?: string };
      if (!data.reply) throw new Error("пустой ответ");
      setMessages((m) => [...m, { role: "assistant", content: data.reply! }]);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "неизвестная ошибка";
      setMessages((m) => [...m, { role: "assistant", content: `Не удалось получить ответ: ${reason}. Попробуйте ещё раз.`, error: true }]);
    } finally {
      setTyping(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="grid size-9 place-items-center rounded-full bg-emerald-500 text-white"><Bot className="size-5" /></div>
        <div>
          <p className="text-sm font-semibold">Гид Career Quest</p>
          <p className="text-xs text-muted-foreground">AI отвечает на вопросы о продукте</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <Bubble from="assistant">Спросите что угодно о Career Quest: как работает наставник, что за город и кто что видит.</Bubble>
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-2 pt-1">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void ask(q)}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => <Bubble key={i} from={m.role} error={m.error}>{m.content}</Bubble>)}
        {typing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in-0">
            <span className="flex gap-1">
              {[0, 150, 300].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: `${d}ms` }} />)}
            </span>
            печатает…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ваш вопрос о продукте…"
          aria-label="Вопрос гиду"
          className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        />
        <Button type="submit" size="icon" className="size-10 bg-emerald-500 text-white hover:bg-emerald-400" disabled={!input.trim() || typing} aria-label="Отправить">
          <SendHorizontal />
        </Button>
      </form>
    </div>
  );
}

function Bubble({ from, error, children }: { from: Msg["role"]; error?: boolean; children: ReactNode }) {
  const mine = from === "user";
  return (
    <div className={`flex animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          mine
            ? "rounded-br-sm bg-slate-900 text-white"
            : error
              ? "rounded-bl-sm border border-red-200 bg-red-50 text-red-700"
              : "rounded-bl-sm bg-muted text-foreground"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
