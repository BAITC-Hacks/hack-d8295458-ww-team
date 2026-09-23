"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProposal, chooseProposal, type FormState } from "@/app/actions";

const initialState: FormState = { error: null, success: false };

async function submitProposal(previous: FormState, data: FormData): Promise<FormState> {
  try { return await createProposal(previous, data); }
  catch { return { error: "Не удалось связаться с сервером. Попробуйте отправить отклик позже." }; }
}

async function submitChoice(previous: FormState, data: FormData): Promise<FormState> {
  try { return await chooseProposal(previous, data); }
  catch { return { error: "Не удалось связаться с сервером. Попробуйте выбрать команду позже." }; }
}

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="button" type="submit" disabled={pending}>{pending ? "Загрузка..." : children}</button>;
}

export function ProposalForm({ taskId }: { taskId: string }) {
  const [state, action] = useFormState(submitProposal, initialState);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.success) { form.current?.reset(); router.refresh(); }
  }, [state, router]);
  return <form ref={form} action={action} className="mt-4 space-y-4">
    <input type="hidden" name="taskId" value={taskId} />
    <label><span>Название команды *</span><input name="teamName" required maxLength={200} /></label>
    <label><span>Идея решения *</span><textarea name="idea" required rows={3} maxLength={10000} /></label>
    <label><span>План работ *</span><textarea name="plan" required rows={3} maxLength={10000} /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label><span>Срок</span><input name="deadline" maxLength={200} placeholder="Например, 2 недели" /></label>
      <label><span>Ссылка на материалы</span><input name="link" type="url" placeholder="https://…" /></label>
    </div>
    {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state?.success && <p role="status" className="text-sm text-emerald-800">Отклик отправлен.</p>}
    <Submit>Отправить отклик</Submit>
  </form>;
}

export function ChooseProposalForm({ taskId, proposalId, accepted }: { taskId: string; proposalId: string; accepted: boolean }) {
  const [state, action] = useFormState(submitChoice, initialState);
  const router = useRouter();
  useEffect(() => { if (state?.success) router.refresh(); }, [state, router]);
  if (accepted) return <p role="status" className="mt-3 font-semibold text-emerald-800">Выбрано бизнесом</p>;
  return <form action={action} className="mt-3 space-y-2">
    <input type="hidden" name="taskId" value={taskId} />
    <input type="hidden" name="proposalId" value={proposalId} />
    {state?.error && <p role="alert" className="text-red-700">{state.error}</p>}
    <Submit>Выбрать команду</Submit>
  </form>;
}
