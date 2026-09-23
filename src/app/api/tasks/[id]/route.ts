import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateBusinessTask } from "@/lib/tasks";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  let changes: unknown;
  try { changes = await request.json(); }
  catch { return NextResponse.json({ error: "Некорректный JSON запроса." }, { status: 400 }); }
  try {
    const task = await updateBusinessTask(params.id, changes);
    if (!task) return NextResponse.json({ error: "Задача не найдена." }, { status: 404 });
    revalidatePath("/catalog");
    revalidatePath("/admin");
    revalidatePath(`/catalog/${params.id}`);
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof Error && !error.name.startsWith("Prisma")) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: "Не удалось сохранить изменения. Попробуйте ещё раз." }, { status: 500 });
  }
}
