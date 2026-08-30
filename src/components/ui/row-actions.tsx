"use client";

import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { ActionIcons, actionLabel } from "@/lib/ui/action-grammar";
import { cn } from "@/lib/utils/cn";
import { Pencil, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type { ActionMenuItem };

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

export function EditRowAction({
  entityLabel,
  active,
  onClick,
}: {
  entityLabel: string;
  active?: boolean;
  onClick: () => void;
}) {
  const label = active
    ? `Cerrar edición de ${entityLabel}`
    : actionLabel("Editar", entityLabel);

  return (
    <IconButton
      label={label}
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

export function MoreRowActions({
  menuLabel,
  items,
}: {
  menuLabel: string;
  items: ActionMenuItem[];
}) {
  return <ActionMenu label={menuLabel} items={items} align="end" />;
}

export function ContributeRowAction({
  entityLabel,
  active,
  onClick,
}: {
  entityLabel: string;
  active?: boolean;
  onClick: () => void;
}) {
  const Icon = ActionIcons.finance.contribute;
  const label = active
    ? `Cerrar aporte a ${entityLabel}`
    : actionLabel("Aportar a", entityLabel);

  return (
    <IconButton
      label={label}
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </IconButton>
  );
}

export function PayRowAction({
  entityLabel,
  active,
  onClick,
}: {
  entityLabel: string;
  active?: boolean;
  onClick: () => void;
}) {
  const Icon = ActionIcons.finance.payment;
  const label = active
    ? `Cerrar pago de ${entityLabel}`
    : actionLabel("Registrar pago de", entityLabel);

  return (
    <IconButton
      label={label}
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </IconButton>
  );
}
