import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyPanel({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="fc-empty py-10 text-center">
      <p className="font-medium text-text">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="mt-5 inline-block">
          <Button>{actionLabel}</Button>
        </Link>
      ) : null}
      {actionLabel && onAction ? (
        <Button type="button" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
