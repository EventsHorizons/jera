"use client";

import { markNotificationReadAction } from "@/app/actions/gamification";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Notif = {
  id: string;
  title: string;
  body: string;
  href: string | null;
};

export function InAppNotificationBanner({ items }: { items: Notif[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;
  const item = items[0]!;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border/80 bg-surface-muted/60 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{item.title}</p>
        <p className="mt-0.5 text-sm text-text-secondary">{item.body}</p>
        {item.href ? (
          <Link href={item.href} className="fc-link mt-2 inline-flex text-xs">
            Abrir →
          </Link>
        ) : null}
      </div>
      <button
        type="button"
        disabled={pending}
        className="text-xs text-text-muted hover:text-text"
        onClick={() => {
          startTransition(async () => {
            const fd = new FormData();
            fd.set("id", item.id);
            await markNotificationReadAction({}, fd);
            router.refresh();
          });
        }}
      >
        Cerrar
      </button>
    </div>
  );
}
