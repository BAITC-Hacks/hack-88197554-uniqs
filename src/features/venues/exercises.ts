import type { DevEvent, Profile, ProgressDelta } from "@/lib/types";

export interface Question {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  hint: string;
}
export interface Exercise {
  kind: "python" | "case";
  title: string;
  brief: string;
  takeaway: string;
  hints: string[];
  questions: Question[];
}
export interface CheckResult {
  label: string;
  passed: boolean;
  detail: string;
}
export interface PracticeResult {
  passed: boolean;
  checks: CheckResult[];
  delta?: ProgressDelta;
  error?: string;
}

export const PYTHON_STARTER = "def total_income(amounts):\n    # Сложите только положительные суммы\n    total = 0\n    for amount in amounts:\n        pass\n    return total\n";
export const PYTHON_CASES = [
  { input: [100, -50, 200, 0], expected: 300, label: "Поступления и списания" },
  { input: [], expected: 0, label: "Пустой список" },
  { input: [-5, -1, 0], expected: 0, label: "Нет поступлений" },
  { input: [5, 5, 10], expected: 20, label: "Повторяющиеся суммы" },
  { input: [1.5, -2, 0.5], expected: 2, label: "Дробные суммы" },
];

const dataQuestions: Question[] = [
  {
    prompt: "После запуска новой версии доля успешных платежей выросла с 90% до 95%. Можно ли считать изменение доказанным эффектом релиза?",
    options: ["Да: показатель вырос на 5 процентных пунктов", "Нет: сначала сравнить группы, объём выборки и сопоставимость периодов", "Да, если выросла и сумма платежей"],
    correct: 1,
    explanation: "Рост метрики — наблюдение. Для вывода о причине нужны сопоставимые группы, размер выборки и оценка неопределённости.",
    hint: "Подумайте, могли ли измениться клиенты или период наблюдения.",
  },
  {
    prompt: "В выгрузке платежей один transaction_id встречается дважды. Как подготовить сумму оборота для отчёта?",
    options: ["Сложить все строки", "Удалить все платежи с одинаковой суммой", "Уточнить семантику дублей и оставить одну корректную запись каждого платежа"],
    correct: 2,
    explanation: "Одинаковая сумма не означает один платёж. Дедупликация по идентификатору и правилам источника защищает метрику от двойного учёта.",
    hint: "Идентификатор описывает платёж точнее, чем его сумма.",
  },
];
const engineeringQuestions: Question[] = [
  {
    prompt: "Клиент отправил платёж, получил таймаут и повторил запрос. Как избежать повторного списания?",
    options: ["Увеличить таймаут", "Принимать ключ идемпотентности и возвращать результат исходной операции", "Попросить пользователя не нажимать кнопку повторно"],
    correct: 1,
    explanation: "Повтор запроса с тем же ключом должен возвращать результат одной операции. Таймаут сам по себе не означает, что платёж не выполнен.",
    hint: "Сеть может потерять ответ уже после успешного списания.",
  },
  {
    prompt: "Какой сценарий лучше всего проверяет защиту от повторного списания?",
    options: ["Два одинаковых запроса с одним ключом: списание одно, результат одинаковый", "Один успешный запрос", "Повторный запрос с новым ключом каждый раз"],
    correct: 0,
    explanation: "Проверка воспроизводит сам риск: повтор одной операции. Новый ключ описывал бы другую операцию.",
    hint: "Повторите исходный запрос, сохранив идентификатор операции.",
  },
];
const peopleQuestions: Question[] = [
  {
    prompt: "Сотрудник дважды пропустил обучение. Как начать разговор о его развитии?",
    options: ["Назначить обязательный курс", "Сравнить его с самым активным коллегой", "Уточнить цель, нагрузку и причины пропусков, затем согласовать подходящий формат"],
    correct: 2,
    explanation: "Пропуски могут быть связаны с нагрузкой, форматом или нерелевантностью темы. Совместный выбор сохраняет добровольность и помогает найти выполнимый шаг.",
    hint: "Сначала выясните причины и ограничения человека.",
  },
  {
    prompt: "Как проверить пользу согласованного обучения?",
    options: ["Посчитать часы просмотра", "Согласовать рабочую задачу для применения навыка и дату обратной связи", "Выдать всем участникам одинаковую оценку"],
    correct: 1,
    explanation: "Применение навыка в работе и конкретная обратная связь показывают результат лучше, чем время участия.",
    hint: "Польза проявляется в изменении действий, а не в количестве часов.",
  },
];
const communicationQuestions: Question[] = [
  {
    prompt: "Клиент раздражён: перевод задержался, а срок зачисления пока неизвестен. Что ответить первым?",
    options: ["Признать неудобство, уточнить детали и назвать срок следующего обновления", "Пообещать зачисление через пять минут", "Сказать, что это проблема другого отдела"],
    correct: 0,
    explanation: "Признание проблемы и конкретный следующий контакт снижают неопределённость без обещаний, которые нельзя подтвердить.",
    hint: "Обещайте действие, которое находится под вашим контролем.",
  },
  {
    prompt: "Перед передачей обращения коллеге что нужно зафиксировать?",
    options: ["Только имя клиента", "Факты, уже выполненные шаги, ответственного и время следующего контакта", "Субъективную оценку поведения клиента"],
    correct: 1,
    explanation: "Такая передача сохраняет контекст и ответственность: клиенту не придётся повторять историю, а обещание следующего контакта не потеряется.",
    hint: "Коллеге нужно понимать, что произошло и какой следующий шаг уже обещан.",
  },
];
const planningQuestions: Question[] = [
  {
    prompt: "Команда предлагает новую функцию. Как выбрать первый шаг при ограниченном времени?",
    options: ["Реализовать все пожелания", "Взять самое простое пожелание без обсуждения", "Сформулировать проблему, ожидаемый эффект и минимальную проверку гипотезы"],
    correct: 2,
    explanation: "Проверка связывает работу с проблемой и измеримым результатом. Простота реализации сама по себе не гарантирует пользы.",
    hint: "Сначала определите, какое предположение нужно проверить.",
  },
  {
    prompt: "Как описать следующий шаг так, чтобы его можно было проверить?",
    options: ["Назвать действие, результат, ответственного и срок", "Написать «улучшить качество»", "Составить длинный список возможных идей"],
    correct: 0,
    explanation: "Конкретный результат и срок позволяют договориться о завершении и получить содержательную обратную связь.",
    hint: "Должно быть понятно, кто что сделает и как узнать, что работа завершена.",
  },
];

export function exerciseFor(event: DevEvent): Exercise {
  const skills = event.develops_skills.map(skill => skill.skill_id).join(" ");
  if (/PYTHON/.test(skills) || /\bpython\b/i.test(event.title)) {
    return {
      kind: "python", title: "Посчитайте поступления на счёт",
      brief: "Напишите total_income(amounts): функция получает список сумм операций и возвращает сумму только положительных значений. Списания и нули пропускайте. Для пустого списка верните 0. Используйте return, а не print.",
      takeaway: "Вы обработали список операций, отфильтровали значения и учли пограничные случаи.",
      hints: ["Начните с total = 0. Пройдите по amounts циклом for.", "Внутри цикла проверьте if amount > 0: и только тогда увеличьте total.", "Внутри if используйте total += amount. return total должен быть после цикла, с отступом как у for."],
      questions: [],
    };
  }
  const [title, questions] = /SQL|STATISTICS|ANALYTICS|DATA_|BI_TOOLS|AB_TESTING|ML_/.test(skills)
    ? ["Разберите данные о платежах", dataQuestions] as const
    : /JAVA|REACT|API_|SYSTEM_DESIGN|CLOUD|CONTAINERS|CICD|SECURITY|TEST_|OBSERVABILITY|HTML|WEB_/.test(skills)
      ? ["Защитите платёж от повторного списания", engineeringQuestions] as const
      : /HR_|TALENT|EMPLOYEE|LEARNING|COACH|LEADERSHIP|LABOR|COMPENSATION|MENTOR/.test(skills) || event.type === "mentoring"
        ? ["Помогите коллеге выбрать шаг развития", peopleQuestions] as const
        : /COMMUNICATION|CUSTOMER|NEGOTIATION|SALES|CRM|PROSPECT|ACCOUNT|TROUBLESHOOT/.test(skills)
          ? ["Помогите клиенту в сложной ситуации", communicationQuestions] as const
          : ["Превратите идею в проверяемый шаг", planningQuestions] as const;
  return {
    kind: "case", title, questions,
    brief: `Практика по теме «${event.title}». Выберите действия в двух рабочих ситуациях. После проверки наставник объяснит каждое решение.`,
    hints: questions.map(question => question.hint),
    takeaway: "Вы разобрали рабочую ситуацию и выбрали действия, которые можно применить на практике.",
  };
}

export function alreadyCompleted(event: DevEvent, profile: Profile): boolean {
  return profile.history.some(record => record.event_id === event.event_id && record.status === "completed"
    && (event.event_id !== "EV_036" || record.date === "2026-10-01"));
}

export function participationBlock(event: DevEvent, profile: Profile): string | null {
  if (event.mandatory) return "Обязательное обучение не начисляет навыки в практике.";
  if (alreadyCompleted(event, profile)) return "Активность уже выполнена.";
  if (!event.target_roles.includes(profile.employee.role) || !event.target_grades.includes(profile.employee.grade)) return "Активность рассчитана на другую роль или грейд.";
  const missing = Object.entries(event.prerequisites).filter(([id, level]) => (profile.effectiveSkills[id] ?? 0) < level);
  if (missing.length) return "Сначала закройте предварительные требования активности.";
  const useful = event.develops_skills.some(skill => {
    const gap = profile.gaps.find(gap => gap.skillId === skill.skill_id);
    return gap && gap.current < Math.min(gap.required, skill.max_level) && skill.gain > 0;
  });
  return useful ? null : "Эта активность уже не закрывает разрывы до вашей цели.";
}
