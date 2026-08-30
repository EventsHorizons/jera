"use client";

import { useActionState, useEffect, useState } from "react";
import {
  archiveAccountAction,
  deleteFinancialAccountAction,
  restoreAccountAction,
} from "@/app/actions/finance";
import { AccountForm } from "@/components/finance/account-form";
import { Alert } from "@/components/ui/alert";
import { Drawer } from "@/components/ui/drawer";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { PageHeader } from "@/components/ui/page-header";
import { PrimaryAction } from "@/components/ui/primary-action";
import {
  EditRowAction,
  MoreRowActions,
  RowActions,
} from "@/components/ui/row-actions";
import {
  ACCOUNT_TYPE_LABELS,
  formatMoney,
} from "@/lib/finance/calculations";
import { ActionIcons } from "@/lib/ui/action-grammar";
import type { ActionState } from "@/lib/utils/errors";
import type { AccountWithBalanceRow } from "@/types/database";
import { useRouter } from "next/navigation";

const initialState: ActionState = {};

export function AccountsManager({
  active,
  archived,
}: {
  active: AccountWithBalanceRow[];
  archived: AccountWithBalanceRow[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteFinancialAccountAction,
    initialState,
  );
  const [archiveState, archiveAction, archiving] = useActionState(
    archiveAccountAction,
    initialState,
  );
  const [restoreState, restoreAction, restoring] = useActionState(
    restoreAccountAction,
    initialState,
  );

  useEffect(() => {
    if (archiveState.success || restoreState.success || deleteState.success) {
      router.refresh();
    }
  }, [
    archiveState.success,
    restoreState.success,
    deleteState.success,
    router,
  ]);

  const flashError =
    deleteState.error || archiveState.error || restoreState.error;
  const flashSuccess =
    deleteState.success || archiveState.success || restoreState.success;

  const ArchiveIcon = ActionIcons.state.archive;
  const TrashIcon = ActionIcons.destroy.trash;
  const MovementIcon = ActionIcons.finance.movement;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cuentas"
        description="Dónde está tu dinero."
        action={
          <PrimaryAction
            label="Agregar cuenta"
            onClick={() => setCreateOpen(true)}
          />
        }
      />

      {flashError ? <Alert variant="error">{flashError}</Alert> : null}
      {flashSuccess ? <Alert variant="success">{flashSuccess}</Alert> : null}

      {active.length === 0 ? (
        <EmptyPanel
          title="Sin cuentas"
          description="Agrega tu banco, efectivo o tarjeta para registrar movimientos."
          actionLabel="Agregar cuenta"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="fc-list">
          {active.map((account) => (
            <article key={account.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{account.name}</p>
                  <p className="mt-0.5 text-sm text-text-muted">
                    {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                    {account.institution ? ` · ${account.institution}` : ""}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <p className="fc-amount shrink-0 text-lg font-semibold text-text">
                    {formatMoney(Number(account.current_balance), account.currency)}
                  </p>
                  <RowActions>
                    <EditRowAction
                      entityLabel={account.name}
                      active={editingId === account.id}
                      onClick={() =>
                        setEditingId(
                          editingId === account.id ? null : account.id,
                        )
                      }
                    />
                    <MoreRowActions
                      menuLabel={`Más acciones para ${account.name}`}
                      items={[
                        {
                          type: "link",
                          label: "Ver movimientos",
                          href: `/transactions?account=${account.id}`,
                          icon: (
                            <MovementIcon
                              className="h-4 w-4 shrink-0"
                              strokeWidth={1.75}
                            />
                          ),
                        },
                        {
                          type: "form",
                          label: "Archivar",
                          action: archiveAction,
                          hiddenFields: { id: account.id },
                          disabled: archiving,
                          icon: (
                            <ArchiveIcon
                              className="h-4 w-4 shrink-0"
                              strokeWidth={1.75}
                            />
                          ),
                        },
                        {
                          type: "form",
                          label: "Eliminar cuenta",
                          action: deleteAction,
                          hiddenFields: { id: account.id },
                          disabled: deleting,
                          destructive: true,
                          confirmMessage: `¿Eliminar la cuenta "${account.name}"? Esta acción no se puede deshacer.`,
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
                <div className="flex items-center gap-2">
                  <span className="fc-amount text-text-muted">
                    {formatMoney(Number(account.current_balance), account.currency)}
                  </span>
                  <MoreRowActions
                    menuLabel={`Acciones para ${account.name}`}
                    items={[
                      {
                        type: "form",
                        label: "Restaurar",
                        action: restoreAction,
                        hiddenFields: { id: account.id },
                        disabled: restoring,
                        icon: (
                          <ActionIcons.state.restore
                            className="h-4 w-4 shrink-0"
                            strokeWidth={1.75}
                          />
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva cuenta">
        <AccountForm plain onSuccess={() => setCreateOpen(false)} />
        <p className="mt-4 text-xs leading-relaxed text-text-muted">
          El saldo inicial no cuenta como ingreso.
        </p>
      </Drawer>
    </div>
  );
}
