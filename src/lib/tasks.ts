import { prisma } from "./prisma";
import { readPublishCard, isRecord } from "./task-card";
import { withRating } from "./rating";

/** All application writes of BusinessTask go through these functions. */
export async function createBusinessTask(input: unknown) {
  return prisma.businessTask.create({ data: withRating(readPublishCard(input)) });
}

export async function updateBusinessTask(id: string, changes: unknown) {
  if (!isRecord(changes)) throw new Error("Некорректные изменения карточки.");
  // Read, merge and write in one transaction so partial updates rate the full card.
  return prisma.$transaction(async tx => {
    const existing = await tx.businessTask.findUnique({ where: { id } });
    if (!existing) return null;
    const data = readPublishCard({ ...existing, ...changes });
    return tx.businessTask.update({ where: { id }, data: withRating({ ...data, confirmed: existing.confirmed }) });
  });
}
