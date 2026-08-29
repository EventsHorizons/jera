import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyPanel({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="fc-empty py-10 text-center">
      {icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-text-muted">
          {icon}
        </div>
      ) : null}
      <p className="font-medium text-text">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="mt-6 inline-block">
          <Button
            icon={<Plus className="h-4 w-4" strokeWidth={2} />}
            className="gap-2"
          >
            {actionLabel}
          </Button>
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          type="button"
          onClick={onAction}
          className="mt-6 gap-2"
          icon={<Plus className="h-4 w-4" strokeWidth={2} />}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
