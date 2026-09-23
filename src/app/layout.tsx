import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Каталог задач", template: "%s | task-catalog" },
  description: "Задачи бизнеса и предложения команд",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/catalog" className="text-xl font-bold tracking-tight">task<span className="text-indigo-600">-catalog</span></Link>
        <Navigation />
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    <footer className="mx-auto max-w-5xl px-5 py-6 text-sm text-slate-500">От бизнес-задачи к решению команды.</footer>
  </body></html>;
}
