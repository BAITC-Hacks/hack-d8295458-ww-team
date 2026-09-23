import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { proposalStatuses } from "@/lib/labels";
import { TaskRating } from "@/components/task-rating";
import { ProposalForm, ChooseProposalForm } from "@/components/forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Каталог и отклики" };

export default async function CatalogPage({ searchParams }: { searchParams: { created?: string; proposed?: string } }) {
  const tasks = await prisma.businessTask.findMany({ orderBy: { createdAt: "desc" }, include: { proposals: { orderBy: { createdAt: "desc" } } } });
  return <div className="space-y-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="page-title">Каталог задач</h1><p className="mt-3 text-slate-600">Найдите задачу бизнеса и предложите решение от вашей команды.</p></div><Link className="button" href="/business">Создать задачу</Link></div>
    {(searchParams.created === "1" || searchParams.proposed === "1") && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{searchParams.created === "1" ? "Задача создана." : "Отклик отправлен."}</p>}
    {!tasks.length && <div className="card text-center"><h2 className="text-lg font-semibold">Пока нет задач</h2><p className="mt-2 text-slate-500">Создайте первую задачу, чтобы команды могли откликнуться.</p></div>}
    {tasks.map(task => <article key={task.id} className="card space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="break-words text-xl font-semibold"><Link href={`/catalog/${task.id}`} className="hover:text-indigo-700">{task.title}</Link></h2><Link href={`/catalog/${task.id}`} className="text-sm text-indigo-700 underline">Открыть и редактировать</Link></div>
      <TaskRating task={task} />
      <p className="whitespace-pre-wrap break-words text-slate-600">{task.rawDraft}</p>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">{([
        ["Контекст", task.context], ["Данные и материалы", task.dataMaterials], ["Ожидаемый результат", task.expectedResult], ["Критерии успеха", task.successCriteria], ["Ограничения", task.constraints], ["Пользователи", task.users], ["Контакт", task.contact],
      ] as const).filter(([, value]) => value).map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-600">{value}</dd></div>)}</dl>
      <details className="border-t border-slate-100 pt-4"><summary className="cursor-pointer font-medium">Отклики: {task.proposals.length}</summary>
        <div className="mt-4 space-y-3">{!task.proposals.length && <p className="text-sm text-slate-500">Откликов пока нет.</p>}{task.proposals.map(proposal => <div key={proposal.id} className="rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{proposal.teamName}</h3><span className="text-slate-500">{proposalStatuses[proposal.status] ?? proposal.status}</span></div>
          <p className="mt-2 whitespace-pre-wrap break-words">{proposal.idea}</p><p className="mt-2 whitespace-pre-wrap break-words text-slate-600">План: {proposal.plan}</p>
          {proposal.deadline && <p className="mt-2">Срок: {proposal.deadline}</p>}
          <ChooseProposalForm taskId={task.id} proposalId={proposal.id} accepted={proposal.status === "accepted"} />
          {proposal.link && /^https?:\/\//i.test(proposal.link) && <a href={proposal.link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-indigo-700 underline">Материалы команды</a>}
        </div>)}</div>
      </details>
      <details className="border-t border-slate-100 pt-4"><summary className="cursor-pointer font-semibold text-indigo-700">Предложить решение</summary><ProposalForm taskId={task.id} /></details>
    </article>)}
  </div>;
}
