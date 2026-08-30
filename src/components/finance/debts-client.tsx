"use client";

import { useState } from "react";
import { deleteDebtAction } from "@/app/actions/finance";
import {
  DebtEditForm,
  DebtForm,
  DebtPayForm,
} from "@/components/finance/management-forms";
import { Drawer } from "@/components/ui/drawer";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { PageHeader } from "@/components/ui/page-header";
import { PrimaryAction } from "@/components/ui/primary-action";
import {
  EditRowAction,
  MoreRowActions,
  PayRowAction,
  RowActions,
} from "@/components/ui/row-actions";
import { formatMoney } from "@/lib/finance/calculations";
import { ActionIcons } from "@/lib/ui/action-grammar";

type Debt = {
  id: string;
  name: string;
  creditor: string | null;
  original_amount: number;
  paid_amount: number;
  installment_amount: number | null;
  next_payment_date: string | null;
  notes: string | null;
  status: string;
  linked_account_id: string | null;
};

export function DebtsClient({
  debts,
  accounts,
  baseCurrency = "USD",
}: {
  debts: Debt[];
  accounts: Array<{ id: string; name: string }>;
  baseCurrency?: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const TrashIcon = ActionIcons.destroy.trash;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Deudas"
        description="Compromisos pendientes y pagos."
        action={
          <PrimaryAction
            label="Registrar deuda"
            onClick={() => setCreateOpen(true)}
          />
        }
      />

      {debts.length === 0 ? (
        <EmptyPanel
          title="Sin deudas"
          description="Registra préstamos o compromisos para llevar control."
          actionLabel="Añadir deuda"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {debts.map((debt) => {
            const pending =
              Number(debt.original_amount) - Number(debt.paid_amount);

            return (
              <article
                key={debt.id}
                className="rounded-xl border border-border/80 bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{debt.name}</p>
                    {debt.creditor ? (
                      <p className="text-sm text-text-muted">{debt.creditor}</p>
                    ) : null}
                    <p className="fc-amount mt-2 text-2xl font-semibold text-text">
                      {formatMoney(pending, baseCurrency)}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {formatMoney(Number(debt.paid_amount), baseCurrency)} de{" "}
                      {formatMoney(Number(debt.original_amount), baseCurrency)}
                    </p>
                    {debt.next_payment_date ? (
                      <p className="mt-1 text-xs text-text-muted">
                        Próximo: {debt.next_payment_date}
                      </p>
                    ) : null}
                  </div>
                  <RowActions>
                    <PayRowAction
                      entityLabel={debt.name}
                      active={payingId === debt.id}
                      onClick={() =>
                        setPayingId(payingId === debt.id ? null : debt.id)
                      }
                    />
                    <EditRowAction
                      entityLabel={debt.name}
                      active={editingId === debt.id}
                      onClick={() =>
                        setEditingId(editingId === debt.id ? null : debt.id)
                      }
                    />
                    <MoreRowActions
                      menuLabel={`Más acciones para ${debt.name}`}
                      items={[
                        {
                          type: "form",
                          label: "Eliminar deuda",
                          action: deleteDebtAction,
                          hiddenFields: { id: debt.id },
                          destructive: true,
                          confirmMessage: `¿Eliminar "${debt.name}"?`,
                          icon: (
                            <TrashIcon
                              className="h-4 w-4 shrink-0"
                              strokeWidth={1.75}
                            />
                          ),
                        },
                      ]}
                    />
                  </RowActions>
                </div>
                {payingId === debt.id ? (
                  <div className="mt-4 max-w-sm border-t border-border/80 pt-4">
                    <DebtPayForm debtId={debt.id} accounts={accounts} />
                  </div>
                ) : null}
                {editingId === debt.id ? (
                  <div className="mt-4 border-t border-border/80 pt-4">
                    <DebtEditForm debt={debt} accounts={accounts} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva deuda">
        <DebtForm accounts={accounts} />
      </Drawer>
    </div>
  );
}
