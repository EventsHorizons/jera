import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";

const PLAN_ITEMS = [
  {
    href: "/budgets",
    title: "Presupuestos",
    description: "Cuánto puedes gastar este mes por categoría.",
  },
  {
    href: "/goals",
    title: "Metas",
    description: "Objetivos de ahorro y progreso.",
  },
  {
    href: "/debts",
    title: "Deudas",
    description: "Pagos pendientes y vencimientos.",
  },
  {
    href: "/recurring",
    title: "Recurrentes",
    description: "Ingresos y gastos que se repiten.",
  },
  {
    href: "/achievements",
    title: "Progreso",
    description: "Racha, medallas, nivel y cohorte anónima.",
  },
] as const;

export default function PlanPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Plan"
        description="Organiza presupuestos, metas, deudas y pagos recurrentes."
      />
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {PLAN_ITEMS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="block px-5 py-4 hover:bg-surface-muted/40">
              <p className="font-medium text-text">{item.title}</p>
              <p className="mt-0.5 text-sm text-text-secondary">{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
