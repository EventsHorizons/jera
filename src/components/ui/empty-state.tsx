import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="fc-page-title">{title}</h1>
        <p className="fc-page-subtitle">{description}</p>
      </div>
      <div className="fc-card-muted p-8 text-center">
        <p className="text-sm text-text-muted">Sin registros todavía.</p>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="mt-4 inline-block">
            <Button>{actionLabel}</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
