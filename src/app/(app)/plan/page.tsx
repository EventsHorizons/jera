import { PageHeader } from "@/components/ui/page-header";
import {
  CalendarClock,
  ChevronRight,
  PiggyBank,
  Scale,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const PLAN_ITEMS: Array<{
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    href: "/budgets",
    title: "Presupuestos",
    description: "Límites por categoría",
    icon: Scale,
  },
  {
    href: "/goals",
    title: "Metas",
    description: "Objetivos de ahorro",
    icon: Target,
  },
  {
    href: "/debts",
    title: "Deudas",
    description: "Compromisos pendientes",
    icon: PiggyBank,
  },
  {
    href: "/recurring",
    title: "Recurrentes",
    description: "Pagos que se repiten",
    icon: CalendarClock,
  },
  {
    href: "/achievements",
    title: "Progreso",
    description: "Constancia y evolución",
    icon: Trophy,
  },
];

export default function PlanPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Plan" description="Presupuestos, metas y compromisos." />
      <ul className="divide-y divide-border rounded-xl border border-border/80 bg-surface">
        {PLAN_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-4 px-4 py-4 transition hover:bg-surface-muted/50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-text-secondary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <p className="font-medium text-text">{item.title}</p>
                  <p className="text-sm text-text-secondary">{item.description}</p>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
