// SSE для стрима шагов агента. Сервер: sseStream(...) → Response.
// Клиент: readSse(await fetch(url, { method: "POST", ... }), onStep). POST, поэтому не EventSource.

import type { AgentStep } from "./types";

export function sseStream(steps: AsyncIterable<AgentStep>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const step of steps) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
        }
      } catch (e) {
        const error: AgentStep = { type: "tool_error", tool: "agent", error: e instanceof Error ? e.message : String(e) };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(error)}\n\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function readSse(response: Response, onStep: (step: AgentStep) => void): Promise<void> {
  if (!response.ok || !response.body) throw new Error(`stream failed: ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (line) onStep(JSON.parse(line.slice(6)) as AgentStep);
    }
  }
}
