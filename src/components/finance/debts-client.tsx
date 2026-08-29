"use client";

import { useState } from "react";
import { deleteDebtAction } from "@/app/actions/finance";
import {
  DebtEditForm,
  DebtForm,
  DebtPayForm,
} from "@/components/finance/management-forms";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { PageHeader } from "@/components/ui/page-header";
import { formatMoney } from "@/lib/finance/calculations";

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
}: {
  debts: Debt[];
  accounts: Array<{ id: string; name: string }>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Deudas"
        description="Lo que debes, lo que has pagado y lo que queda pendiente."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Registrar deuda
          </Button>
        }
      />

      {debts.length === 0 ? (
        <EmptyPanel
          title="No tienes deudas registradas"
          description="Si tienes préstamos o compromisos pendientes, regístralos aquí para no perderlos de vista."
          actionLabel="Añadir deuda"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {debts.map((debt) => {
            const pending =
              Number(debt.original_amount) - Number(debt.paid_amount);

            return (
              <article key={debt.id} className="border-b border-border pb-8 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{debt.name}</p>
                    {debt.creditor ? (
                      <p className="text-sm text-text-muted">{debt.creditor}</p>
                    ) : null}
                    <p className="fc-amount mt-2 text-2xl font-semibold text-text">
                      {formatMoney(pending)}
                      <span className="text-base font-normal text-text-muted">
                        {" "}
                        pendiente
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Pagado {formatMoney(Number(debt.paid_amount))} de{" "}
                      {formatMoney(Number(debt.original_amount))}
                    </p>
                    {debt.next_payment_date ? (
                      <p className="mt-1 text-sm text-text-muted">
                        Próximo pago: {debt.next_payment_date}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm">
                    <button
                      type="button"
                      className="fc-link font-medium"
                      onClick={() => setPayingId(payingId === debt.id ? null : debt.id)}
                    >
                      Registrar pago
                    </button>
                    <button
                      type="button"
                      className="text-text-secondary hover:text-text"
                      onClick={() =>
                        setEditingId(editingId === debt.id ? null : debt.id)
                      }
                    >
                      Editar
                    </button>
                    <form action={deleteDebtAction}>
                      <input type="hidden" name="id" value={debt.id} />
                      <button type="submit" className="text-text-muted hover:text-danger">
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
                {payingId === debt.id ? (
                  <div className="mt-4 max-w-sm">
                    <DebtPayForm debtId={debt.id} accounts={accounts} />
                  </div>
                ) : null}
                {editingId === debt.id ? (
                  <div className="mt-4">
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
