// Серверный банк практических заданий. Эталоны и правильные ответы в клиент не уходят:
// клиент получает только PublicTask (см. ../exercises.ts) через GET /api/venues/practice.
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface CodeTest {
  label: string;
  args: Json[];
  expected: Json;
  /** проверить, что функция не изменила свои аргументы */
  pure?: boolean;
}

export interface CodeTask {
  kind: "python" | "ts";
  title: string;
  brief: string;
  functionName: string;
  example: { call: string; result: string; note: string };
  starter: string;
  tests: CodeTest[];
  hints: [string, string, string];
  takeaway: string;
  /** эталонное решение: только сервер */
  solution: string;
}

export interface QuizQuestion {
  prompt: string;
  /** варианты — фрагменты кода (например, SQL) */
  codeOptions?: boolean;
  options: string[];
  correct: number;
  explanation: string;
  hint: string;
}

export interface QuizTask {
  kind: "quiz";
  title: string;
  brief: string;
  takeaway: string;
  questions: QuizQuestion[];
}

export type Task = CodeTask | QuizTask;
