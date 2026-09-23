"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Answers, fieldLabels, Question, TaskCard, taskFields } from "@/lib/task-card";
import { TaskRating } from "./task-rating";

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  let result;
  try {
    response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    result = await response.json();
  } catch {
    throw new Error(path === "/api/tasks" ? "Не удалось связаться с сервером. Попробуйте ещё раз." : "Не удалось связаться с AI, попробуйте позже");
  }
  if (!response.ok) throw new Error(result.error || "Не удалось выполнить запрос. Попробуйте ещё раз.");
  return result;
}

export function BusinessWizard() {
  const router = useRouter();
  const [step, setStep] = useState<"draft" | "questions" | "card">("draft");
  const [rawDraft, setRawDraft] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [card, setCard] = useState<TaskCard | null>(null);
  const [questionSource, setQuestionSource] = useState("stub");
  const [cardSource, setCardSource] = useState("stub");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  function moveTo(next: typeof step) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try { await work(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось связаться с сервером. Попробуйте ещё раз."); }
    finally { lock.current = false; setBusy(false); }
  }

  function clarify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      const result = await post<{ questions: Question[]; source: string; error?: string }>("/api/clarify", { rawDraft });
      setQuestionSource(result.source);
      setQuestions(result.questions);
      setNotice(result.error || "");
      moveTo("questions");
    });
  }

  function build(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      const result = await post<{ card: TaskCard; source: string; error?: string }>("/api/build-card", { rawDraft, answers });
      setCardSource(result.source);
      setCard(result.card);
      setNotice(result.error || "");
      moveTo("card");
    });
  }

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await post("/api/tasks", card);
      router.push("/catalog");
      router.refresh();
    });
  }

  return <section className="card space-y-6" aria-busy={busy}>
    <ol aria-label="Этапы создания задачи" className="flex flex-wrap gap-4 text-sm text-slate-500">
      {([ ["draft", "1. Черновик"], ["questions", "2. Уточнения"], ["card", "3. Карточка"] ] as const).map(([key, title]) => <li key={key} aria-current={step === key ? "step" : undefined} className={step === key ? "font-semibold text-indigo-700" : ""}>{title}</li>)}
    </ol>
    <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">{step === "draft" ? "Начните с описания" : step === "questions" ? "Уточните детали" : "Проверьте карточку перед публикацией"}</h2>
    {step !== "draft" && <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Источник: {({ openai: "OpenAI", nvidia: "NVIDIA (резерв)", stub: "Заглушка" } as Record<string, string>)[step === "questions" ? questionSource : cardSource] || "Заглушка"}</span>}
    {notice && <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{notice}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {step === "draft" && <form onSubmit={clarify}>
      <fieldset disabled={busy} className="space-y-5">
        <label><span>Опишите вашу задачу или потребность</span><textarea name="rawDraft" value={rawDraft} onChange={event => setRawDraft(event.target.value)} required minLength={1} maxLength={20000} rows={7} placeholder="Что вы хотите улучшить? Расскажите своими словами." /></label>
        <button type="submit" className="button" disabled={busy || !rawDraft.trim()}>{busy ? "Загрузка..." : "Продолжить"}</button>
      </fieldset>
    </form>}
    {step === "questions" && <form onSubmit={build}>
      <fieldset disabled={busy} className="space-y-5">
        <p className="text-sm text-slate-500">Ответьте на вопросы. Если информации пока нет, так и напишите.</p>
        {questions.map(({ field, question }) => <label key={field}><span>{question}</span><textarea name={field} value={answers[field] || ""} onChange={event => setAnswers(previous => ({ ...previous, [field]: event.target.value }))} rows={3} required maxLength={10000} /></label>)}
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => moveTo("draft")} className="rounded-lg border px-4 py-2 text-sm">Назад к черновику</button><button type="submit" className="button" disabled={busy}>{busy ? "Загрузка..." : "Сформировать карточку"}</button></div>
      </fieldset>
    </form>}
    {step === "card" && card && <form onSubmit={publish}>
      <fieldset disabled={busy} className="space-y-5">
        <p className="text-sm text-slate-500">Проверьте формулировки и заполните недостающее. Все поля описания можно изменить.</p>
        <label><span>Название задачи *</span><input name="title" value={card.title} onChange={event => setCard({ ...card, title: event.target.value })} required maxLength={200} /></label>
        <label><span>Исходный черновик *</span><textarea name="rawDraft" value={card.rawDraft} onChange={event => setCard({ ...card, rawDraft: event.target.value })} required maxLength={20000} rows={5} /></label>
        <div className="grid gap-5 sm:grid-cols-2">{taskFields.map(field => <label key={field}><span>{fieldLabels[field]}</span><textarea name={field} value={card[field] || ""} onChange={event => setCard({ ...card, [field]: event.target.value })} maxLength={20000} rows={4} /></label>)}</div>
        <TaskRating task={card} />
        <p className="text-sm text-slate-500">После подтверждения задача появится в каталоге. Если нужно изменить ответы, вернитесь к уточнениям; повторное формирование заменит правки карточки.</p>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => moveTo("questions")} className="rounded-lg border px-4 py-2 text-sm">Назад к уточнениям</button><button type="submit" className="button" disabled={busy}>{busy ? "Загрузка..." : "Подтвердить и опубликовать"}</button></div>
      </fieldset>
    </form>}
  </section>;
}
