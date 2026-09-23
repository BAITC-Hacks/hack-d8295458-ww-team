import { NextResponse } from "next/server";
import { buildTaskCard } from "@/lib/task-ai";
import { Answers, isRecord, readAnswers, readDraft } from "@/lib/task-card";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let rawDraft: string;
  let answers: Answers;
  try {
    const body: unknown = await request.json();
    rawDraft = readDraft(body);
    answers = readAnswers(isRecord(body) ? body.answers : undefined);
  } catch (error) { return NextResponse.json({ error: error instanceof SyntaxError ? "Некорректный JSON запроса." : (error as Error).message }, { status: 400 }); }
  return NextResponse.json(await buildTaskCard(rawDraft, answers));
}
