"use client";

import { CommandPalette } from "@/components/layout/command-palette";
import { MobileQuickEntryDock } from "@/components/layout/mobile-quick-entry-dock";
import { QuickExpenseDialog } from "@/components/layout/quick-expense-dialog";
import { cn } from "@/lib/utils/cn";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Menu,
  Receipt,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: LayoutGrid },
  { href: "/transactions", label: "Movimientos", icon: Receipt },
  { href: "/budgets", label: "Presupuesto", icon: Target },
] as const;

const SECONDARY_LINKS = [
  { href: "/accounts", label: "Cuentas" },
  { href: "/goals", label: "Metas" },
  { href: "/debts", label: "Deudas" },
  { href: "/recurring", label: "Recurrentes" },
  { href: "/settings/profile", label: "Ajustes" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  displayName,
  emailVerified,
  accounts,
  categories,
}: {
  children: ReactNode;
  displayName: string;
  emailVerified: boolean;
  accounts: Array<{ value: string; label: string }>;
  categories: Array<{ value: string; label: string }>;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border/80 bg-surface transition-[width] duration-200 md:flex",
          sidebarCollapsed ? "w-[4.25rem]" : "w-52",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/80 px-3 py-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 text-sm font-semibold text-text",
              sidebarCollapsed && "justify-center",
            )}
          >
            <Wallet className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {!sidebarCollapsed ? <span>FinControl</span> : null}
          </Link>
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="rounded-full p-1 text-text-muted hover:bg-surface-muted hover:text-text"
              aria-label="Colapsar menú"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="mx-auto mt-2 rounded-full p-1.5 text-text-muted hover:bg-surface-muted"
            aria-label="Expandir menú"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : null}
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      sidebarCollapsed && "justify-center px-2",
                      active
                        ? "bg-surface-muted font-medium text-text"
                        : "text-text-secondary hover:bg-surface-muted/70 hover:text-text",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {!sidebarCollapsed ? item.label : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          {!sidebarCollapsed ? (
            <div className="mt-6 border-t border-border/80 pt-4">
              <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-text-muted">
                Más
              </p>
              <ul className="space-y-0.5">
                {SECONDARY_LINKS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(pathname, item.href)
                          ? "bg-surface-muted font-medium text-text"
                          : "text-text-secondary hover:bg-surface-muted/70 hover:text-text",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </nav>
        {!sidebarCollapsed ? (
          <div className="border-t border-border/80 px-5 py-4">
            <p className="truncate text-sm font-medium text-text">{displayName}</p>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border/80 bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold md:hidden">
            <Wallet className="h-4 w-4" strokeWidth={1.75} />
            FinControl
          </Link>
          <button
            type="button"
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
              );
            }}
            className="hidden flex-1 items-center gap-2 rounded-full border border-border/80 bg-surface-muted/80 px-4 py-2 text-sm text-text-muted transition hover:bg-surface-muted md:flex md:max-w-md"
          >
            <span>Registrar gasto…</span>
            <kbd className="ml-auto rounded-md border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <div className="relative ml-auto flex items-center gap-2 md:ml-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-surface-muted text-text-secondary hover:text-text md:hidden"
              aria-label="Más opciones"
            >
              <Menu className="h-4 w-4" strokeWidth={1.75} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-border/80 bg-surface py-1 shadow-lg md:hidden">
                {SECONDARY_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-text-secondary hover:bg-surface-muted hover:text-text"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <QuickExpenseDialog
              accounts={accounts}
              categories={categories}
              className="hidden lg:inline-flex"
            />
          </div>
        </header>

        {!emailVerified ? (
          <div className="border-b border-warning/20 bg-warning-soft px-4 py-2 text-sm text-warning sm:px-6">
            Verifica tu correo.{" "}
            <Link href="/verify-email" className="font-medium underline">
              Reenviar
            </Link>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 pb-36 md:pb-8">
          {children}
        </main>

        <CommandPalette accounts={accounts} categories={categories} />
        <MobileQuickEntryDock accounts={accounts} categories={categories} />

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-surface/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-[5rem] flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium",
                    active ? "text-text" : "text-text-muted",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.75} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
