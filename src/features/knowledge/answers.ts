import { ARTICLES, findArticles } from "./catalog";
import type { KnowledgeContext } from "./context";

/** Ответы из проверяемых фактов доступны и без LLM. Ничего не назначают и не начисляют. */
export function knowledgeReply(query: string, knowledge: KnowledgeContext): string | null {
  const text = query.toLowerCase();
  const event = knowledge.catalog.mentionedEvents.find(item => text.includes(item.eventId.toLowerCase()) || text.includes(item.title.toLowerCase()));
  if (event) return `«${event.title}»\n${event.description}\n\nГде: ${event.place}. Длительность: ${event.durationHours} ч. ${event.format === "self_paced" ? "В своём темпе." : `Ближайшая сессия: ${event.nextSession ?? "не назначена"}.`}\n${event.mandatory ? "Обязательная активность не входит в подбор развития и не даёт наград." : event.participationBlock ?? "Условия участия выполнены; полезность для цели проверяется при подборе."}\n\nИсточник: каталог активностей и профиль. Это справка об активности; участие выбираешь ты.`;
  const company = knowledge.companies.find(item => text.includes(item.name.toLowerCase()) || text.includes(item.department.toLowerCase()));
  if (company) return `${company.name} — вывеска башни отдела ${company.department} в нашем демо. Этажи: Junior → Middle → Senior → Lead.\n\n${ARTICLES[1].text}\n\nТвой отдел — ${knowledge.department}. ${knowledge.summary}\n\nИсточник: карта города, профиль и матрица ролей.`;

  const specific = knowledge.coverage.filter(gap => text.includes(gap.name.toLowerCase()) || text.includes(gap.skillId.toLowerCase()));
  if (specific.length || /разрыв|пробел|не хватает|не закры|нет курс|нет обуч|проект|рабоч.{0,4} задач|разбер.{0,8}профил/.test(text)) {
    const gaps = (specific.length ? specific : knowledge.coverage).slice(0, 3);
    const details = gaps.map(gap => {
      const availability = gap.available.length
        ? `Есть доступное обучение: ${gap.available.map(option => `«${option.title}» (${gap.current} → ${option.to})`).join("; ")}. Попроси подобрать следующий шаг, чтобы получить карточки с факторами выбора.`
        : `Сейчас нет доступного обучения: ${gap.reasons.join("; ").toLowerCase()}.`;
      return `${gap.name}: ${gap.current} → ${gap.required}${gap.critical ? ", критичный для цели" : ""}. ${availability}\nИдея для обсуждения: ${gap.advice}`;
    });
    return [knowledge.summary, ...details, "Советы по рабочим задачам не создают проекты и не меняют навыки. Реальные проекты и их владельцы не подключены; объём задачи и оценку результата согласует руководитель.", "Источники: профиль, история, матрица ролей и каталог активностей."].join("\n\n");
  }
  // Запрос обучения оставляем существующему подбору с ограничениями по формату и времени.
  if (/подбер|предлож.{0,15}(обуч|курс|шаг)|с чего начать|есть только|онлайн|офлайн|час/.test(text) && !/почему|где|как|экосистем/.test(text)) return null;
  const articles = findArticles(query, 2);
  if (!articles.length) return null;
  const selected = /экосистем|компани|что.{0,8}умеешь/.test(text) ? [ARTICLES[0], ARTICLES[1]] : articles;
  const companyList = /экосистем|компани/.test(text)
    ? `\n\nБашни демо: ${knowledge.companies.map(item => `${item.name} — ${item.department}`).join("; ")}.` : "";
  const personal = /профил|грейд|повышен|цел|почему/.test(text) ? `\n\nПо твоему профилю: ${knowledge.summary}` : "";
  return selected.map(article => `${article.title}\n${article.text}\nИсточник: ${article.source}.`).join("\n\n") + companyList + personal;
}
