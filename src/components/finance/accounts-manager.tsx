"use client";

import { useActionState, useState } from "react";
import {
  archiveAccountAction,
  deleteFinancialAccountAction,
  restoreAccountAction,
} from "@/app/actions/finance";
import { AccountForm } from "@/components/finance/account-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { PageHeader } from "@/components/ui/page-header";
import {
  ACCOUNT_TYPE_LABELS,
  formatMoney,
} from "@/lib/finance/calculations";
import type { ActionState } from "@/lib/utils/errors";
import type { AccountWithBalanceRow } from "@/types/database";
import Link from "next/link";

const initialState: ActionState = {};

export function AccountsManager({
  active,
  archived,
}: {
  active: AccountWithBalanceRow[];
  archived: AccountWithBalanceRow[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteFinancialAccountAction,
    initialState,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tus cuentas"
        description="Dónde está tu dinero ahora mismo."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Nueva cuenta
          </Button>
        }
      />

      {deleteState.error ? <Alert variant="error">{deleteState.error}</Alert> : null}
      {deleteState.success ? <Alert variant="success">{deleteState.success}</Alert> : null}

      {active.length === 0 ? (
        <EmptyPanel
          title="Aún no tienes cuentas"
          description="Agrega tu banco, efectivo o tarjeta para empezar a registrar movimientos."
          actionLabel="Crear primera cuenta"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="fc-list">
          {active.map((account) => (
            <article key={account.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-text">{account.name}</p>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                    {account.institution ? ` · ${account.institution}` : ""}
                  </p>
                </div>
                <p className="fc-amount shrink-0 text-lg font-semibold text-text">
                  {formatMoney(Number(account.current_balance), account.currency)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link
                  href={`/transactions?account=${account.id}`}
                  className="fc-link font-medium"
                >
                  Ver movimientos
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setEditingId(editingId === account.id ? null : account.id)
                  }
                  className="text-text-secondary hover:text-text"
                >
                  {editingId === account.id ? "Cerrar" : "Editar"}
                </button>
                <form action={archiveAccountAction} className="inline">
                  <input type="hidden" name="id" value={account.id} />
                  <button type="submit" className="text-text-muted hover:text-text-secondary">
                    Archivar
                  </button>
                </form>
                <form action={deleteAction} className="inline">
                  <input type="hidden" name="id" value={account.id} />
                  <button
                    type="submit"
                    disabled={deleting}
                    className="text-text-muted hover:text-danger"
                  >
                    Eliminar
                  </button>
                </form>
              </div>
              {editingId === account.id ? (
                <div className="mt-4 border-t border-border pt-4">
                  <AccountForm mode="edit" account={account} plain />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <section className="fc-section">
          <h2 className="fc-label">Archivadas</h2>
          <div className="space-y-2">
            {archived.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-xl bg-surface-muted/50 px-4 py-3 text-sm"
              >
                <span className="text-text-secondary">{account.name}</span>
                <div className="flex items-center gap-3">
                  <span className="fc-amount text-text-muted">
                    {formatMoney(Number(account.current_balance), account.currency)}
                  </span>
                  <form action={restoreAccountAction}>
                    <input type="hidden" name="id" value={account.id} />
                    <button type="submit" className="fc-link text-xs font-medium">
                      Restaurar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva cuenta">
        <AccountForm plain />
        <p className="mt-4 text-xs leading-relaxed text-text-muted">
          El saldo inicial no cuenta como ingreso. Las tarjetas y préstamos son
          obligaciones, no dinero disponible.
        </p>
      </Drawer>
    </div>
  );
}
