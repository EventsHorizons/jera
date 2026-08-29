import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

type AlertProps = {
  children: ReactNode;
  variant?: "error" | "success" | "info" | "warning";
};

export function Alert({ children, variant = "info" }: AlertProps) {
  const styles = {
    error: "border-danger/20 bg-danger-soft text-danger",
    success: "border-success/20 bg-success-soft text-success",
    info: "border-primary/20 bg-primary-soft text-primary",
    warning: "border-warning/20 bg-warning-soft text-warning",
  };

  return (
    <div className={cn("rounded-[10px] border px-3 py-2 text-sm", styles[variant])}>
      {children}
    </div>
  );
}
