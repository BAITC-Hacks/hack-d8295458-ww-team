import type { BusinessTask } from "@prisma/client";

export const ratingFields = {
  context: { weight: 20, label: "Контекст и потребность" },
  dataMaterials: { weight: 20, label: "Данные и материалы" },
  expectedResult: { weight: 15, label: "Ожидаемый результат" },
  successCriteria: { weight: 15, label: "Критерии успеха" },
  constraints: { weight: 10, label: "Ограничения" },
  users: { weight: 10, label: "Пользователи" },
  contact: { weight: 10, label: "Контакт и формат связи" },
} as const;

export type RatedField = keyof typeof ratingFields;
export type RatingInput = Pick<BusinessTask, RatedField>;
export type TaskStatus = "draft" | "working" | "ready" | "priority";

// Accepts BusinessTask as well as an unsaved card containing its rated fields.
export function calculateScore(task: RatingInput) {
  const breakdown = {} as Record<RatedField, number>;
  const missing: string[] = [];
  let score = 0;
  for (const field of Object.keys(ratingFields) as RatedField[]) {
    const { weight, label } = ratingFields[field];
    const points = typeof task[field] === "string" && task[field].trim() ? weight : 0;
    breakdown[field] = points;
    score += points;
    if (!points) missing.push(label);
  }
  return { score, breakdown, missing };
}

export function getStatus(score: number): TaskStatus {
  if (score < 40) return "draft";
  if (score < 70) return "working";
  if (score < 90) return "ready";
  return "priority";
}

export function withRating<T extends RatingInput>(task: T): T & { score: number; status: TaskStatus } {
  const { score } = calculateScore(task);
  return { ...task, score, status: getStatus(score) };
}
