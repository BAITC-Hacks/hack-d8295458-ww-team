"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/business", label: "Создать задачу" },
  { href: "/catalog", label: "Каталог и отклики" },
  { href: "/admin", label: "Проверка задач" },
];

export function Navigation() {
  const pathname = usePathname();
  return <nav aria-label="Основная навигация" className="flex flex-wrap gap-2">
    {links.map(({ href, label }) => <Link key={href} href={href}
      aria-current={pathname === href ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pathname === href ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
      {label}
    </Link>)}
  </nav>;
}
