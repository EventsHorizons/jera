"use client";

import { deleteTransactionAction } from "@/app/actions/finance";
import { MoreRowActions, RowActions } from "@/components/ui/row-actions";
import { ActionIcons } from "@/lib/ui/action-grammar";
import Link from "next/link";

export function TransactionRowActions({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  const TrashIcon = ActionIcons.destroy.trash;
  const label = description.trim() || "movimiento";

  return (
    <RowActions>
      <Link
        href={`/transactions/${id}`}
        aria-label={`Editar ${label}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <ActionIcons.edit.pencil className="h-4 w-4" strokeWidth={1.75} />
      </Link>
      <MoreRowActions
        menuLabel={`Acciones para ${label}`}
        items={[
          {
            type: "form",
            label: "Eliminar movimiento",
            action: deleteTransactionAction,
            hiddenFields: { id },
            destructive: true,
            confirmMessage: "¿Eliminar este movimiento?",
            icon: (
              <TrashIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            ),
          },
        ]}
      />
    </RowActions>
  );
}
