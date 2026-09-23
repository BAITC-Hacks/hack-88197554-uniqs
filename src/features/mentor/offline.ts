import { getEvent } from "@/lib/store";
import type { LlmMessage } from "@/lib/llm";
import type { Profile, Recommendation } from "@/lib/types";
import { knowledgeReply } from "@/features/knowledge/answers";
import type { KnowledgeContext } from "@/features/knowledge/context";

/** Справка и персональные пробелы доступны без сети; подбор сохраняет ограничения сотрудника. */
export function offlineReply(profile: Profile, candidates: Recommendation[], messages: LlmMessage[], knowledge?: KnowledgeContext) {
  const latest = messages.at(-1)?.content.toLowerCase() ?? "";
  const answer = knowledge && knowledgeReply(latest, knowledge);
  if (answer) return { message: answer, recommendations: [] as Recommendation[] };
  const goal = profile.target ? `${profile.target.role} · ${profile.target.grade}` : "развитие навыков";
  let maxHours = Infinity;
  let format: string | undefined;
  let avoidCourses = false;
  for (const message of messages.filter((item) => item.role === "user")) {
    const value = message.content.toLowerCase();
    const hours = value.match(/(\d+(?:[.,]\d+)?)\s*(?:час|ч\b)/);
    if (hours) maxHours = Number(hours[1].replace(",", "."));
    if (/без ограничений|сколько угодно/.test(value)) maxHours = Infinity;
    if (/любой формат|формат не важен/.test(value)) format = undefined;
    else if (/офлайн|очно/.test(value)) format = "offline";
    else if (/онлайн/.test(value)) format = "online";
    else if (/сво[её]м темпе/.test(value)) format = "self_paced";
    if (/не хочу курс|без курс/.test(value)) avoidCourses = true;
    else if (/курсы подходят|можно курсы/.test(value)) avoidCourses = false;
  }
  const filtered = candidates.filter((candidate) => {
    const event = getEvent(candidate.eventId);
    return event && event.duration_hours <= maxHours && (!format || event.format === format)
      && (!avoidCourses || event.type !== "course");
  });
  if (/почему|объясни/.test(latest)) {
    return {
      message: `Цель профиля — ${goal}. В демо-режиме шаги выбираются по разрывам навыков и условиям участия. В каждой карточке раскрой «Факторы выбора» — там исходные цифры. Для разбора конкретного вопроса в свободном диалоге нужен OpenAI.`,
      recommendations: [] as Recommendation[],
    };
  }
  const wantsSteps = !messages.length || /подбер|предлож|шаг|начать|обуч|курс|час|онлайн|офлайн|очно|темпе|senior|грейд|расти|развити|вариант/.test(latest);
  if (!wantsSteps) return {
    message: "В базе знаний нет точного ответа на этот вопрос. Могу разобрать профиль, объяснить возможности города и HR, найти причины пробелов каталога или предложить обучение. Для сведений о реальном проекте нужны его описание, ожидаемый результат и требования к навыкам — их можно уточнить у руководителя.",
    recommendations: [] as Recommendation[],
  };
  return {
    message: filtered.length
      ? `Цель профиля — ${goal}. Вот шаги из предварительного подбора${Number.isFinite(maxHours) ? ` длительностью до ${maxHours} ч` : ""}${format ? ", с учётом выбранного формата" : ""}. Подбор рассчитан по правилам: цель, польза для навыков и история участия.`
      : `Среди предварительно подобранных шагов нет подходящих под эти ограничения. ${knowledge?.summary ?? "Можно изменить формат или общее время на активность."} Можно спросить: «Какие пробелы в моём профиле?» — покажу причины и идеи практики для обсуждения с руководителем.`,
    recommendations: filtered,
  };
}
