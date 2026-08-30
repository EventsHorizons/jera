"use client";

import Link from "next/link";
import { Collapsible } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

type FilterParams = {
  type?: string;
  account?: string;
  category?: string;
  q?: string;
  from?: string;
  to?: string;
};

const fieldClass =
  "h-11 min-h-11 w-full rounded-xl border border-border/80 bg-surface px-4 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

export function TransactionFilters({
  params,
  accounts,
  categories,
}: {
  params: FilterParams;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}) {
  const hasActive =
    Boolean(params.type) ||
    Boolean(params.account) ||
    Boolean(params.category) ||
    Boolean(params.q) ||
    Boolean(params.from) ||
    Boolean(params.to);

  return (
    <Collapsible label={hasActive ? "Filtros · activos" : "Filtros"}>
      <form className="space-y-3 rounded-xl border border-border/80 bg-surface p-4">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por descripción…"
          className={fieldClass}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <select name="type" defaultValue={params.type ?? ""} className={fieldClass} aria-label="Tipo">
            <option value="">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
            <option value="transfer">Transferencias</option>
            <option value="adjustment">Ajustes</option>
          </select>
          <select name="account" defaultValue={params.account ?? ""} className={fieldClass} aria-label="Cuenta">
            <option value="">Todas las cuentas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={params.category ?? ""} className={fieldClass} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="from" type="date" defaultValue={params.from ?? ""} className={fieldClass} aria-label="Desde" />
          <input name="to" type="date" defaultValue={params.to ?? ""} className={fieldClass} aria-label="Hasta" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Aplicar
          </Button>
          <Link href="/transactions" className="fc-btn-ai-secondary inline-flex flex-1 items-center justify-center">
            Limpiar
          </Link>
        </div>
      </form>
    </Collapsible>
  );
}
