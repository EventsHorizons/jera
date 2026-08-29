"use client";

import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import {
  Archive,
  Banknote,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function RowActions({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>{children}</div>
  );
}

export function EditAction({
  active,
  onClick,
  label = "Editar",
}: {
  active?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <IconButton
      label={active ? "Cerrar" : label}
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
    >
      {active ? (
        <X className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <Pencil className="h-4 w-4" strokeWidth={1.75} />
      )}
    </IconButton>
  );
}

export function DeleteFormAction({
  action,
  id,
  label = "Eliminar",
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="id" value={id} />
      <IconButton
        type="submit"
        label={label}
        variant="danger"
        disabled={disabled}
        tooltip
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
    </form>
  );
}

export function ArchiveFormAction({
  action,
  id,
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="id" value={id} />
      <IconButton
        type="submit"
        label="Archivar"
        variant="ghost"
        disabled={disabled}
      >
        <Archive className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
    </form>
  );
}

export function RestoreFormAction({
  action,
  id,
  disabled,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  disabled?: boolean;
}) {
  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="id" value={id} />
      <IconButton
        type="submit"
        label="Restaurar"
        variant="ghost"
        disabled={disabled}
      >
        <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
      </IconButton>
    </form>
  );
}

export function ContributeAction({
  active,
  onClick,
}: {
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      label={active ? "Cerrar aporte" : "Aportar"}
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
    >
      <Plus className="h-4 w-4" strokeWidth={1.75} />
    </IconButton>
  );
}

export function PayAction({
  active,
  onClick,
}: {
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      label={active ? "Cerrar pago" : "Registrar pago"}
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
    >
      <Banknote className="h-4 w-4" strokeWidth={1.75} />
    </IconButton>
  );
}

export function ViewTransactionsLink({ href }: { href: string }) {
  return (
    <Tooltip label="Ver movimientos">
      <Link
        href={href}
        aria-label="Ver movimientos"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-muted hover:text-text",
        )}
      >
        <Receipt className="h-4 w-4" strokeWidth={1.75} />
      </Link>
    </Tooltip>
  );
}
