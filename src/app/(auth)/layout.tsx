import { JeraLogo } from "@/components/brand/jera-logo";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background text-text">
      <header className="flex h-16 items-center border-b border-border/80 bg-surface px-4 sm:px-6">
        <Link href="/">
          <JeraLogo size="md" />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
