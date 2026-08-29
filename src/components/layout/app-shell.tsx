"use client";

import { JeraLogo, JeraMark } from "@/components/brand/jera-logo";
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
  accounts,
  categories,
}: {
  children: ReactNode;
  displayName: string;
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
    <div className="fc-app-root">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border/80 bg-surface transition-[width] duration-200 sm:flex",
          sidebarCollapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/80 px-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 text-sm font-semibold text-text",
              sidebarCollapsed && "justify-center",
            )}
          >
            {sidebarCollapsed ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <JeraMark size="sm" />
              </span>
            ) : (
              <JeraLogo size="sm" />
            )}
          </Link>
          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="fc-touch-target rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
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
            className="fc-touch-target mx-auto mt-2 rounded-full text-text-muted hover:bg-surface-muted"
            aria-label="Expandir menú"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ) : null}
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm transition-colors",
                      sidebarCollapsed && "justify-center px-2",
                      active
                        ? "bg-surface-muted font-medium text-text"
                        : "text-text-secondary hover:bg-surface-muted hover:text-text",
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
            <div className="mt-8 border-t border-border/80 pt-4">
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-text-muted">
                Más
              </p>
              <ul className="space-y-1">
                {SECONDARY_LINKS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex min-h-11 items-center rounded-xl px-4 py-2 text-sm transition-colors",
                        isActive(pathname, item.href)
                          ? "bg-surface-muted font-medium text-text"
                          : "text-text-secondary hover:bg-surface-muted hover:text-text",
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
          <div className="border-t border-border/80 px-4 py-4">
            <p className="truncate text-sm font-medium text-text">{displayName}</p>
          </div>
        ) : null}
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border/80 bg-surface/95 px-4 backdrop-blur sm:px-6">
          <Link href="/dashboard" className="sm:hidden">
            <JeraLogo size="sm" />
          </Link>
          <button
            type="button"
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
              );
            }}
            className="hidden h-11 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-surface-muted px-4 text-sm text-text-muted transition hover:bg-surface-muted sm:flex lg:max-w-md"
          >
            <span>Registrar gasto…</span>
            <kbd className="ml-auto rounded-lg border border-border/80 bg-surface px-2 py-1 font-mono text-xs">
              ⌘K
            </kbd>
          </button>
          <div className="relative ml-auto flex items-center gap-2 sm:ml-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="fc-touch-target rounded-xl border border-border/80 bg-surface-muted text-text-secondary hover:text-text sm:hidden"
              aria-label="Más opciones"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-border/80 bg-surface p-2 shadow-[0_4px_16px_rgba(0,0,0,0.08)] sm:hidden">
                {SECONDARY_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm text-text-secondary hover:bg-surface-muted hover:text-text"
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

        <main className="fc-main">{children}</main>

        <CommandPalette accounts={accounts} categories={categories} />
        <MobileQuickEntryDock accounts={accounts} categories={categories} />

        <nav className="fc-mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-surface/95 backdrop-blur sm:hidden">
          <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-2">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 min-w-16 flex-1 flex-col items-center justify-center gap-1 px-2 text-xs font-medium",
                    active ? "text-text" : "text-text-muted",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
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
