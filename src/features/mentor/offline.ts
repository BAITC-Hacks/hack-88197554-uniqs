import { getEvent } from "@/lib/store";
import type { LlmMessage } from "@/lib/llm";
import type { Profile, Recommendation } from "@/lib/types";

/** Прозрачный демо-режим: только простые ограничения; свободный диалог требует OpenAI. */
export function offlineReply(profile: Profile, candidates: Recommendation[], messages: LlmMessage[]) {
  const latest = messages.at(-1)?.content.toLowerCase() ?? "";
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
    message: "Я пока в демо-режиме и не могу полноценно разобрать свободный вопрос. Могу показать рассчитанные шаги и отфильтровать их по длительности и формату. Например: «Подбери обучение онлайн до 4 часов».",
    recommendations: [] as Recommendation[],
  };
  return {
    message: filtered.length
      ? `Цель профиля — ${goal}. Вот шаги из предварительного подбора${Number.isFinite(maxHours) ? ` длительностью до ${maxHours} ч` : ""}${format ? ", с учётом выбранного формата" : ""}. Это демо-подбор по правилам; OpenAI пока не подключён.`
      : "Среди предварительно подобранных шагов нет подходящих под эти ограничения. Можно изменить формат или увеличить общее время на активность. Сейчас доступен демо-подбор по правилам; для свободного диалога нужен OpenAI.",
    recommendations: filtered,
  };
}
