import { BusinessWizard } from "@/components/business-wizard";

export const metadata = { title: "Создать задачу" };

export default function BusinessPage() {
  return <div className="space-y-7">
    <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">Для бизнеса</p><h1 className="page-title">Создать задачу</h1><p className="mt-3 text-slate-600">Начните с черновика. Подробности помогут командам предложить решение.</p></div>
    <BusinessWizard />
  </div>;
}
