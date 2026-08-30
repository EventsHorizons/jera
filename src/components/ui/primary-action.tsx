import { Button } from "@/components/ui/button";
import { ActionIcons } from "@/lib/ui/action-grammar";
import type { ReactNode } from "react";

type PrimaryActionProps = {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
};

/** CTA primario de pantalla: icono + texto (nunca solo icono). */
export function PrimaryAction({
  label,
  onClick,
  type = "button",
  loading,
  icon,
  className,
}: PrimaryActionProps) {
  const Icon = ActionIcons.create.add;
  return (
    <Button
      type={type}
      onClick={onClick}
      loading={loading}
      className={className}
      icon={icon ?? <Icon className="h-4 w-4" strokeWidth={2} />}
    >
      {label}
    </Button>
  );
}
