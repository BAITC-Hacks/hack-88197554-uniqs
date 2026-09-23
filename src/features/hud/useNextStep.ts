"use client";

import { useEffect, useRef, useState } from "react";
import { actions, getState } from "@/lib/client-store";
import { readSse } from "@/lib/sse";
import type { AgentStep } from "@/lib/types";

export function useNextStep() {
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function cancel() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setSteps([]);
    setError("");
    setFinished(false);
  }

  async function recommend() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const employeeId = getState().employeeId;
    setBusy(true);
    setSteps([]);
    setError("");
    setFinished(false);
    let gotFinal = false;
    try {
      const response = await fetch("/api/mentor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId }), signal: controller.signal });
      await readSse(response, (step) => {
        if (controller.signal.aborted || getState().employeeId !== employeeId) return;
        setSteps((prev) => [...prev, step]);
        if (step.type === "tool_error") setError(step.error);
        if (step.type === "final") { gotFinal = true; actions.setRecommendations(step.recommendations); setFinished(true); }
      });
      if (!gotFinal && !controller.signal.aborted) setError("Подбор не завершился. Попробуйте ещё раз.");
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Не удалось получить рекомендацию");
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }
  return { busy, steps, error, finished, recommend, cancel };
}
