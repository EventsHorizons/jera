"use client";

import { TransactionForm } from "@/components/finance/transaction-form";
import { Collapsible } from "@/components/ui/collapsible";

type AccountOption = { id: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; kind: string; parent_id?: string | null };

export function AdvancedTransactionPanel({
  accounts,
  categories,
  recentExpenses,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  recentExpenses: Array<{ id: string; label: string }>;
}) {
  return (
    <Collapsible label="Ingreso, transferencia o ajuste">
      <p className="mb-4 text-sm text-text-secondary">
        Usa <strong>+ Agregar gasto</strong> para registrar gastos rápidos. Aquí
        puedes registrar otros tipos de movimiento.
      </p>
      <TransactionForm
        accounts={accounts}
        categories={categories}
        recentExpenses={recentExpenses}
      />
    </Collapsible>
  );
}
