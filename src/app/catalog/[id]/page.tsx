import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TaskEditor } from "@/components/task-editor";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: { id: string } }) {
  const task = await prisma.businessTask.findUnique({ where: { id: params.id } });
  if (!task) notFound();
  return <div className="space-y-6">
    <Link href="/catalog" className="text-sm text-indigo-700 underline">← Каталог задач</Link>
    <h1 className="page-title">Карточка задачи</h1>
    <TaskEditor task={task} />
  </div>;
}
