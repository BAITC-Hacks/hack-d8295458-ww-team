import { NextResponse } from "next/server";
import { clarifyTask } from "@/lib/task-ai";
import { readDraft } from "@/lib/task-card";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let rawDraft: string;
  try { rawDraft = readDraft(await request.json()); }
  catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? "Некорректный JSON запроса." : (error as Error).message }, { status: 400 }); }
  return NextResponse.json(await clarifyTask(rawDraft));
}
