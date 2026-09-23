import { prisma } from "@/lib/prisma";
import { taskStatuses } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Проверка задач" };

export default async function AdminPage() {
  const tasks = await prisma.businessTask.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { proposals: true } } } });
  return <div className="space-y-7">
    <div><h1 className="page-title">Проверка задач</h1><p className="mt-3 text-slate-600">Временный список для проверки. Авторизация и инструменты модерации ещё не подключены.</p></div>
    <div className="card overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="mb-4 text-left font-medium text-slate-500">Всего задач: {tasks.length}</caption>
      <thead className="border-b text-slate-500"><tr>{["Задача", "Статус", "Баллы", "Подтверждена", "Отклики"].map(label => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead>
      <tbody>{tasks.map(task => <tr key={task.id} className="border-b last:border-0"><td className="px-3 py-4 font-medium">{task.title}</td><td className="px-3 py-4">{taskStatuses[task.status] ?? task.status}</td><td className="px-3 py-4">{task.score}</td><td className="px-3 py-4">{task.confirmed ? "Да" : "Нет"}</td><td className="px-3 py-4">{task._count.proposals}</td></tr>)}</tbody>
    </table>{!tasks.length && <p className="py-8 text-center text-slate-500">Задачи для проверки пока не добавлены.</p>}</div>
  </div>;
}
