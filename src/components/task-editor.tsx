"use client";

import { FormEvent, useState, useRef } from "react";
import type { BusinessTask } from "@prisma/client";
import { useRouter } from "next/navigation";
import { fieldLabels, taskFields } from "@/lib/task-card";
import { TaskRating } from "./task-rating";

type EditableTask = Pick<BusinessTask, "id" | "title" | "rawDraft" | typeof taskFields[number]>;

export function TaskEditor({ task }: { task: EditableTask }) {
  const [card, setCard] = useState(task);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const router = useRouter();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(card) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось сохранить изменения.");
      setCard(result.task);
      setMessage("Изменения сохранены. Рейтинг и статус пересчитаны.");
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось связаться с сервером."); }
    finally { lock.current = false; setBusy(false); }
  }

  return <form onSubmit={save} className="card space-y-5" aria-busy={busy}>
    <TaskRating task={card} />
    <p className="text-sm text-slate-500">Рейтинг обновляется при вводе. Нажмите «Сохранить изменения», чтобы записать карточку в каталог.</p>
    {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <fieldset disabled={busy} className="space-y-5">
      <label><span>Название задачи *</span><input value={card.title} onChange={event => setCard({ ...card, title: event.target.value })} required maxLength={200} /></label>
      <label><span>Исходный черновик *</span><textarea value={card.rawDraft} onChange={event => setCard({ ...card, rawDraft: event.target.value })} required maxLength={20000} rows={5} /></label>
      <div className="grid gap-5 sm:grid-cols-2">{taskFields.map(field => <label key={field}><span>{fieldLabels[field]}</span><textarea value={card[field] || ""} onChange={event => setCard({ ...card, [field]: event.target.value })} maxLength={20000} rows={4} /></label>)}</div>
      <button type="submit" className="button" disabled={busy}>{busy ? "Загрузка..." : "Сохранить изменения"}</button>
    </fieldset>
  </form>;
}
