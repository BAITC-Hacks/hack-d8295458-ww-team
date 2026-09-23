"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type FormState = { error: string | null; success?: boolean };

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createProposal(_previous: FormState, data: FormData): Promise<FormState> {
  const taskId = field(data, "taskId");
  const teamName = field(data, "teamName");
  const idea = field(data, "idea");
  const plan = field(data, "plan");
  const link = field(data, "link");
  if (!taskId || !teamName || !idea || !plan) return { error: "Заполните команду, идею и план." };
  if (teamName.length > 200 || idea.length > 10000 || plan.length > 10000) return { error: "Сократите название команды до 200 символов, идею и план — до 10 000." };
  if (link) {
    try {
      if (!["http:", "https:"].includes(new URL(link).protocol)) throw new Error("protocol");
    } catch { return { error: "Укажите ссылку, начинающуюся с http:// или https://." }; }
  }
  try {
    await prisma.proposal.create({ data: { taskId, teamName, idea, plan, deadline: field(data, "deadline") || null, link: link || null } });
  } catch { return { error: "Не удалось отправить отклик. Убедитесь, что задача существует, и повторите попытку." }; }
  revalidatePath("/catalog");
  revalidatePath("/admin");
  revalidatePath(`/catalog/${taskId}`);
  return { error: null, success: true };
}

export async function chooseProposal(_previous: FormState, data: FormData): Promise<FormState> {
  const taskId = field(data, "taskId");
  const proposalId = field(data, "proposalId");
  if (!taskId || !proposalId) return { error: "Выберите отклик." };
  try {
    const found = await prisma.$transaction(async tx => {
      const proposal = await tx.proposal.findFirst({ where: { id: proposalId, taskId } });
      if (!proposal) return false;
      await tx.proposal.updateMany({ where: { taskId, id: { not: proposalId } }, data: { status: "rejected" } });
      await tx.proposal.update({ where: { id: proposalId }, data: { status: "accepted" } });
      return true;
    });
    if (!found) return { error: "Отклик не найден у этой задачи. Обновите страницу." };
  } catch { return { error: "Не удалось выбрать команду. Попробуйте ещё раз." }; }
  revalidatePath("/catalog");
  revalidatePath("/admin");
  revalidatePath(`/catalog/${taskId}`);
  return { error: null, success: true };
}
