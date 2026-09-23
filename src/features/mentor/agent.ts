// Мок-цикл наставника: фиксированная последовательность шагов с паузами, чтобы стрим был виден в UI.
import { getProfile } from "@/features/engine/profile";
import { recommend } from "@/features/engine/recommend";
import { complete } from "@/lib/llm";
import type { AgentStep, Profile, Recommendation } from "@/lib/types";

const PAUSE_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const SYSTEM =
  "Ты карьерный наставник. Перепиши объяснение рекомендации живым русским языком. Не добавляй новых фактов и факторов.";

export async function* runMentor(employeeId: string): AsyncGenerator<AgentStep> {
  yield { type: "thought", text: "Смотрю профиль и цель…" };
  await sleep(PAUSE_MS);

  yield { type: "tool_call", tool: "get_profile", input: { employeeId } };
  await sleep(PAUSE_MS);
  let profile: Profile;
  try {
    const p = getProfile(employeeId);
    if (!p) throw new Error(`Сотрудник ${employeeId} не найден`);
    profile = p;
    yield {
      type: "tool_result",
      tool: "get_profile",
      output: {
        role: p.employee.role,
        grade: p.employee.grade,
        target: p.target,
        gaps: p.gaps.length,
        criticalGaps: p.gaps.filter((g) => g.critical).length,
      },
    };
  } catch (e) {
    yield { type: "tool_error", tool: "get_profile", error: errText(e) };
    yield { type: "final", recommendations: [] };
    return;
  }
  await sleep(PAUSE_MS);

  yield {
    type: "thought",
    text: profile.target
      ? `Цель — ${profile.target.role} ${profile.target.grade}. Ищу активности, которые закрывают разрывы…`
      : "Цели нет, ищу активности для роста в своей роли…",
  };
  await sleep(PAUSE_MS);

  yield { type: "tool_call", tool: "recommend", input: { employeeId } };
  await sleep(PAUSE_MS);
  let recs: Recommendation[] = [];
  try {
    recs = recommend(employeeId);
    yield {
      type: "tool_result",
      tool: "recommend",
      output: recs.map((r) => ({ eventId: r.eventId, score: r.score })),
    };
  } catch (e) {
    yield { type: "tool_error", tool: "recommend", error: errText(e) };
  }
  await sleep(PAUSE_MS);

  const recommendations = await Promise.all(
    recs.map(async (r) => ({
      ...r,
      explanation: (await complete({ system: SYSTEM, messages: [{ role: "user", content: r.explanation }] })) || r.explanation,
    })),
  );
  yield { type: "final", recommendations };
}
