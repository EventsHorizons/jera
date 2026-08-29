"use client";

import { deleteTransactionAction } from "@/app/actions/finance";
import { IconButton } from "@/components/ui/icon-button";
import { RowActions } from "@/components/ui/row-actions";
import { Tooltip } from "@/components/ui/tooltip";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

export function TransactionRowActions({ id }: { id: string }) {
  return (
    <RowActions>
      <Tooltip label="Editar">
        <Link
          href={`/transactions/${id}`}
          aria-label="Editar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-muted hover:text-text"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </Tooltip>
      <form action={deleteTransactionAction} className="inline-flex">
        <input type="hidden" name="id" value={id} />
        <IconButton type="submit" label="Eliminar" variant="danger">
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </IconButton>
      </form>
    </RowActions>
  );
}
