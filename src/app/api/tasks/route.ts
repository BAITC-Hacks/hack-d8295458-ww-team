import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createBusinessTask } from "@/lib/tasks";
import { readPublishCard } from "@/lib/task-card";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let data: ReturnType<typeof readPublishCard>;
  try { data = readPublishCard(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? "Некорректный JSON запроса." : (error as Error).message }, { status: 400 }); }
  try {
    const task = await createBusinessTask(data);
    revalidatePath("/catalog");
    revalidatePath("/admin");
    return NextResponse.json({ id: task.id, redirectTo: "/catalog" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Не удалось опубликовать задачу. Ваши правки сохранены в форме — попробуйте ещё раз." }, { status: 500 });
  }
}
