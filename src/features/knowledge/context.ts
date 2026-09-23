import { alreadyCompleted, availabilityError, nextSessionOf } from "@/features/engine/eligibility";
import { DEPARTMENT_COMPANY } from "@/features/city/companies";
import { AS_OF, getEvents, getRoleProfile, getSkill } from "@/lib/store";
import { PLACES, venueForEvent } from "@/lib/world";
import type { Profile } from "@/lib/types";
import { ARTICLES, findArticles } from "./catalog";

export function buildKnowledge(profile: Profile, query = "", excludedEventIds: string[] = []) {
  const events = getEvents();
  const requirements = profile.target ? getRoleProfile(profile.target.role, profile.target.grade) : undefined;
  const coverage = [...profile.gaps]
    .sort((a, b) => Number(b.critical) - Number(a.critical) || (b.required - b.current) - (a.required - a.current))
    .map(gap => {
      const skill = getSkill(gap.skillId);
      const related = events.filter(event => !event.mandatory && event.develops_skills.some(item => item.skill_id === gap.skillId));
      const options = related.map(event => {
        const growth = event.develops_skills.find(item => item.skill_id === gap.skillId)!;
        const to = Math.min(gap.current + growth.gain, growth.max_level, gap.required);
        const reason = excludedEventIds.includes(event.event_id) ? "Отложено в текущем диалоге"
          : alreadyCompleted(event, profile) ? "Уже завершено"
          : to <= gap.current ? "Предел курса не выше текущего уровня"
            : availabilityError(event, profile);
        return { eventId: event.event_id, title: event.title, reason, to, placeId: venueForEvent(event).id };
      });
      const available = options.filter(option => !option.reason);
      const reasons = [...new Set(options.flatMap(option => option.reason ? [option.reason] : []))];
      const projectIdea = skill?.type === "soft"
        ? `Предложи руководителю небольшую рабочую ситуацию для тренировки «${skill.name}»: проведи обсуждение или разбор кейса, заранее согласуй наблюдаемые критерии и запроси обратную связь.`
        : `Предложи руководителю небольшую задачу по «${skill?.name ?? gap.skillId}»: подготовь решение и объяснение принятых решений, согласуй критерии качества и разбор с экспертом.`;
      return {
        ...gap, name: skill?.name ?? gap.skillId, description: skill?.description ?? "",
        status: available.length ? "available" as const : "uncovered" as const,
        available, reasons: related.length ? reasons : ["В каталоге нет добровольных активностей по этому навыку"],
        advice: projectIdea,
        source: "Матрица ролей, каталог активностей и ваша история",
      };
    });
  const summary = !profile.target
    ? "Следующего грейда нет. Выбери направление развития, чтобы построить план."
    : !requirements || !Object.keys(requirements.required_skills).length
      ? "Для выбранной цели нет требований в матрице. Уточни их у руководителя или HR; оценить готовность пока нельзя."
      : !coverage.length
        ? "Все требования цели по навыкам закрыты. Подготовь примеры результатов к разговору о повышении с руководителем."
        : `Закрыто ${profile.gradeProgress.met} из ${profile.gradeProgress.total} требований цели. Разрывов: ${coverage.length}; без доступного обучения сейчас: ${coverage.filter(gap => gap.status === "uncovered").length}.`;
  const matched = findArticles(query);
  const search = query.toLowerCase();
  const words = search.match(/[\p{L}\p{N}]{4,}/gu) ?? [];
  const mentionedEvents = events.map(event => ({
    event,
    score: search.includes(event.event_id.toLowerCase()) || search.includes(event.title.toLowerCase()) ? 100
      : words.filter(word => event.title.toLowerCase().includes(word)).length,
  })).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 4).map(({ event }) => ({
    eventId: event.event_id, title: event.title, description: event.description,
    type: event.type, format: event.format, durationHours: event.duration_hours,
    mandatory: event.mandatory, nextSession: nextSessionOf(event),
    place: venueForEvent(event).name,
    participationBlock: alreadyCompleted(event, profile) ? "Уже завершено" : availabilityError(event, profile),
    skills: event.develops_skills.map(skill => ({ ...skill, name: getSkill(skill.skill_id)?.name ?? skill.skill_id })),
    source: "Каталог активностей; справочная информация, не рекомендация",
  }));
  return {
    asOf: AS_OF, summary,
    target: profile.target,
    company: DEPARTMENT_COMPANY[profile.employee.department] ?? profile.employee.department,
    department: profile.employee.department,
    skills: Object.entries(profile.effectiveSkills).map(([id, level]) => ({ id, name: getSkill(id)?.name ?? id, level })),
    coverage,
    companies: Object.entries(DEPARTMENT_COMPANY).map(([department, name]) => ({ department, name })),
    places: PLACES.filter(place => place.kind === "venue" || place.kind === "office" || place.kind === "mentor")
      .map(place => ({ id: place.id, name: place.name, kind: place.kind, eventType: place.eventType })),
    catalog: { total: events.length, voluntary: events.filter(event => !event.mandatory).length, mentionedEvents },
    articles: matched.length ? matched : [ARTICLES[0], ARTICLES[3], ARTICLES[4]],
    sources: ["Профиль и история сотрудника", "Матрица ролей", "Каталог активностей", "Карта и правила Career Quest"],
  };
}

export type KnowledgeContext = ReturnType<typeof buildKnowledge>;
