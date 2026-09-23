import { getRoleProfiles, getSkills } from "@/lib/store";
import type { Grade } from "@/lib/types";

export interface LearningTemplate {
  id: string; title: string; role: string | null; grade: Grade | null;
  description: string; durationDays: number; focus: { id: string; name: string; level: number }[];
  milestones: string[];
}

export function learningTemplates(): LearningTemplate[] {
  const names = new Map(getSkills().map((s) => [s.skill_id, s.name]));
  return [
    ...getRoleProfiles().map((profile): LearningTemplate => ({
      id: `role:${profile.role}:${profile.grade}`, title: `${profile.role} · ${profile.grade}`,
      role: profile.role, grade: profile.grade,
      description: "Обучение по разрывам до целевой роли, применение знаний в работе и встреча с наставником.",
      durationDays: profile.grade === "Lead" || profile.grade === "Senior" ? 90 : 60,
      focus: Object.entries(profile.required_skills).sort(([a], [b]) => Number(profile.critical_skills.includes(b)) - Number(profile.critical_skills.includes(a))).slice(0, 5).map(([id, level]) => ({ id, name: names.get(id) ?? id, level })),
      milestones: ["Определить приоритетные навыки", "Пройти подходящие активности", "Выполнить практическое задание", "Обсудить результат с наставником"],
    })),
    {
      id: "career-discovery", title: "Определение карьерной цели", role: null, grade: null, durationDays: 14,
      description: "Для сотрудников без следующего грейда или выбранной цели: обсуждение интересов, оценка сильных сторон и выбор направления.",
      focus: [], milestones: ["Обсудить интересы с наставником", "Выбрать направление и согласовать следующий план"],
    },
  ];
}

export const PRACTICE_BRIEFS: Record<string, string> = {
  "Backend Engineer": "Разберите небольшой сервис: опишите решение, интерфейсы, обработку ошибок и способ проверки. Подготовьте пример или схему для ревью.",
  "Frontend Engineer": "Соберите небольшой пользовательский сценарий: состояния интерфейса, доступность и проверка результата. Покажите прототип и объясните решения.",
  "Data Analyst": "Исследуйте обезличенный учебный набор данных: сформулируйте вопрос, проверьте качество данных и подготовьте вывод с визуализацией.",
  "QA Engineer": "Выберите учебную функцию, составьте проверки основных сценариев и рисков, выполните их и подготовьте отчёт о результатах.",
  "Product Manager": "Разберите пользовательскую проблему: сформулируйте гипотезу, ожидаемый эффект, метрику и короткий план проверки.",
  "HR Business Partner": "Разберите учебный HR-кейс: уточните потребность сотрудника и команды, предложите действия и критерии результата без персональных данных.",
  "Sales Manager": "Подготовьте учебную встречу с клиентом: выявление потребности, предложение ценности, ответы на возражения и следующий шаг.",
  "Customer Support Specialist": "Разберите учебное обращение клиента: уточняющие вопросы, поиск решения, объяснение клиенту и критерии эскалации.",
};
