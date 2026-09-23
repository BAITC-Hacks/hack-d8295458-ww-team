import { calculateScore, getStatus, RatedField, ratingFields, RatingInput } from "@/lib/rating";
import { taskStatuses } from "@/lib/labels";

const colors = {
  draft: "bg-slate-100 text-slate-700",
  working: "bg-amber-100 text-amber-900",
  ready: "bg-emerald-100 text-emerald-800",
  priority: "bg-violet-100 text-violet-800",
};

export function TaskRating({ task }: { task: RatingInput }) {
  const { score, breakdown, missing } = calculateScore(task);
  const status = getStatus(score);
  return <section aria-label="Рейтинг заполненности задачи" className="space-y-3 rounded-xl border border-slate-200 p-4">
    <div aria-live="polite"><span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${colors[status]}`}>{score}/100 · {taskStatuses[status]}</span></div>
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {(Object.keys(ratingFields) as RatedField[]).map(field => <div key={field} className="flex justify-between gap-3"><dt className="text-slate-600">{ratingFields[field].label}</dt><dd className="whitespace-nowrap font-medium">{breakdown[field]} / {ratingFields[field].weight}</dd></div>)}
    </dl>
    <p className="text-sm text-slate-600">{missing.length ? `Чтобы повысить рейтинг, добавьте: ${missing.join(", ")}.` : "Все поля заполнены — максимальный рейтинг."}</p>
  </section>;
}
