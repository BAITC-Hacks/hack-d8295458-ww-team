import { withRating } from "./rating";

export const fieldLabels = {
  context: "Контекст и потребность",
  dataMaterials: "Данные и материалы",
  expectedResult: "Ожидаемый результат",
  successCriteria: "Критерии успеха",
  constraints: "Ограничения",
  users: "Пользователи",
  contact: "Контакт и формат связи",
} as const;

export type TaskField = keyof typeof fieldLabels;
export const taskFields = Object.keys(fieldLabels) as TaskField[];
export type Question = { field: TaskField; question: string };
export type Answers = Partial<Record<TaskField, string>>;
export type TaskCard = Record<TaskField, string | null> & {
  title: string;
  rawDraft: string;
  score: number;
  status: "draft" | "working" | "ready" | "priority";
  confirmed: boolean;
  // Database-managed fields do not exist until publication.
  id: string | null;
  createdAt: string | null;
  proposals: [];
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readDraft(body: unknown): string {
  if (!isRecord(body) || typeof body.rawDraft !== "string" || !body.rawDraft.trim() || body.rawDraft.length > 20000) {
    throw new Error("Опишите задачу: от 1 до 20 000 символов.");
  }
  return body.rawDraft.trim();
}

export function readAnswers(value: unknown): Answers {
  if (!isRecord(value) || Object.keys(value).some(key => !taskFields.includes(key as TaskField))) throw new Error("Некорректный список ответов.");
  const answers: Answers = {};
  for (const field of taskFields) {
    if (value[field] === undefined) continue;
    if (typeof value[field] !== "string" || value[field].length > 10000) throw new Error("Каждый ответ должен быть текстом до 10 000 символов.");
    answers[field] = value[field].trim();
  }
  return answers;
}

export function parseQuestions(text: string): Question[] {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || !Array.isArray(value.questions) || value.questions.length < 3 || value.questions.length > 7) throw new Error("Invalid questions");
  const seen = new Set<string>();
  return value.questions.map(item => {
    if (!isRecord(item) || typeof item.field !== "string" || !taskFields.includes(item.field as TaskField) || seen.has(item.field) || typeof item.question !== "string" || !item.question.trim() || item.question.length > 1000) throw new Error("Invalid question");
    seen.add(item.field);
    return { field: item.field as TaskField, question: item.question.trim() };
  });
}

const defaultQuestions: Record<TaskField, string> = {
  context: "Как сейчас решается эта задача и в чём основная трудность?",
  dataMaterials: "Какие данные, примеры или материалы вы можете предоставить команде?",
  expectedResult: "Какой конкретный результат вы хотите получить от студенческой команды?",
  successCriteria: "По каким признакам или показателям вы поймёте, что задача решена успешно?",
  constraints: "Какие есть ограничения по срокам, бюджету и технологиям?",
  users: "Кто будет пользоваться решением и какие действия ему нужно выполнять?",
  contact: "С кем команде связываться и в каком формате удобнее общаться?",
};

export function stubQuestions(rawDraft: string): Question[] {
  const hints: Record<TaskField, RegExp> = {
    context: /сейчас|проблем|трудност|вручную|потребност/i,
    dataMaterials: /данн|таблиц|excel|csv|материал|документ/i,
    expectedResult: /результат|получить|создать|разработать|нужен|нужна|хотим/i,
    successCriteria: /критери|успех|процент|\d+\s*%|показател/i,
    constraints: /бюджет|срок|ограничен|рубл|тенге|недел/i,
    users: /пользовател|сотрудник|клиент|менеджер/i,
    contact: /контакт|связ|telegram|телеграм|почт|@/i,
  };
  // Keyword hints only change question priority; they do not invent answers.
  const ordered = [...taskFields.filter(field => !hints[field].test(rawDraft)), ...taskFields.filter(field => hints[field].test(rawDraft))];
  return ordered.slice(0, 4).map(field => ({ field, question: defaultQuestions[field] }));
}

export function stubCard(rawDraft: string, answers: Answers): TaskCard {
  return withRating({
    id: null, createdAt: null, proposals: [], confirmed: false,
    title: rawDraft.split(/[\n.!?]/)[0].trim().slice(0, 200) || "Новая задача",
    rawDraft, score: 0, status: "ready",
    context: answers.context || rawDraft,
    dataMaterials: answers.dataMaterials || null,
    expectedResult: answers.expectedResult || null,
    successCriteria: answers.successCriteria || null,
    constraints: answers.constraints || null,
    users: answers.users || null,
    contact: answers.contact || null,
  });
}

export function parseCard(text: string, rawDraft: string): TaskCard {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value) || typeof value.title !== "string" || !value.title.trim() || value.title.length > 200) throw new Error("Invalid title");
  const card = stubCard(rawDraft, {});
  card.title = value.title.trim();
  for (const field of taskFields) {
    const content = value[field];
    if (content !== null && (typeof content !== "string" || content.length > 20000)) throw new Error("Invalid card field");
    card[field] = typeof content === "string" ? content.trim() || null : null;
  }
  // The draft is preserved verbatim; IDs, score and state are never decided by AI.
  return withRating(card);
}

export function readPublishCard(value: unknown) {
  const rawDraft = readDraft(value);
  if (!isRecord(value) || typeof value.title !== "string" || !value.title.trim() || value.title.length > 200) throw new Error("Укажите название до 200 символов.");
  const fields = {} as Record<TaskField, string | null>;
  for (const field of taskFields) {
    const content = value[field];
    if (content !== null && (typeof content !== "string" || content.length > 20000)) throw new Error(`Поле «${fieldLabels[field]}» должно быть текстом до 20 000 символов.`);
    fields[field] = typeof content === "string" ? content.trim() || null : null;
  }
  return withRating({ ...fields, rawDraft, title: value.title.trim(), confirmed: true });
}
