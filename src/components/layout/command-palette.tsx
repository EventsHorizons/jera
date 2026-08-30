"use client";

import {
  BaseCurrencySwitcher,
  useBaseCurrency,
} from "@/components/finance/base-currency-provider";
import { useExpenseCapture } from "@/components/finance/expense-capture";
import { cn } from "@/lib/utils/cn";
import {
  ArrowDownLeft,
  ArrowUpRight,
  LayoutGrid,
  Plus,
  Receipt,
  Search,
  Settings,
  Target,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  keywords: string;
  icon: typeof Plus;
  run: () => void;
};

export function CommandPalette({
  categories = [],
}: {
  categories?: Array<{ value: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { open: openExpense } = useExpenseCapture();
  const { setBaseCurrency } = useBaseCurrency();

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const focusQuickOrSheet = useCallback(() => {
    const detail = { handled: false };
    document.dispatchEvent(
      new CustomEvent("jera:focus-quick-entry", { detail }),
    );
    if (!detail.handled) openExpense();
  }, [openExpense]);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "add-expense",
        label: "Agregar gasto",
        hint: "N",
        group: "Acciones",
        keywords: "gasto expense add nuevo",
        icon: ArrowUpRight,
        run: () => {
          close();
          // Defer so palette unmounts before focus
          requestAnimationFrame(() => focusQuickOrSheet());
        },
      },
      {
        id: "add-income",
        label: "Registrar ingreso",
        group: "Acciones",
        keywords: "ingreso income",
        icon: ArrowDownLeft,
        run: () => {
          close();
          router.push("/transactions");
        },
      },
      {
        id: "create-goal",
        label: "Crear meta de ahorro",
        group: "Acciones",
        keywords: "meta goal crear objetivo ahorro",
        icon: Target,
        run: () => {
          close();
          router.push("/goals?new=1");
        },
      },
      {
        id: "nav-home",
        label: "Ir a Inicio",
        group: "Navegación",
        keywords: "dashboard inicio home",
        icon: LayoutGrid,
        run: () => {
          close();
          router.push("/dashboard");
        },
      },
      {
        id: "nav-tx",
        label: "Ir a Movimientos",
        group: "Navegación",
        keywords: "transactions historial",
        icon: Receipt,
        run: () => {
          close();
          router.push("/transactions");
        },
      },
      {
        id: "nav-plan",
        label: "Ir a Plan",
        group: "Navegación",
        keywords: "plan presupuestos metas",
        icon: Target,
        run: () => {
          close();
          router.push("/plan");
        },
      },
      {
        id: "nav-goals",
        label: "Ir a Objetivos",
        group: "Navegación",
        keywords: "metas goals ahorro",
        icon: Target,
        run: () => {
          close();
          router.push("/goals");
        },
      },
      {
        id: "nav-accounts",
        label: "Ir a Cuentas",
        group: "Navegación",
        keywords: "accounts cuentas",
        icon: Wallet,
        run: () => {
          close();
          router.push("/accounts");
        },
      },
      {
        id: "nav-progress",
        label: "Ir a Hitos",
        group: "Navegación",
        keywords: "logros achievements hitos progreso",
        icon: Trophy,
        run: () => {
          close();
          router.push("/achievements");
        },
      },
      {
        id: "nav-settings",
        label: "Ir a Ajustes",
        group: "Navegación",
        keywords: "settings perfil",
        icon: Settings,
        run: () => {
          close();
          router.push("/settings/profile");
        },
      },
      ...categories.slice(0, 12).map((c) => ({
        id: `filter-cat-${c.value}`,
        label: `Filtrar: ${c.label}`,
        group: "Filtros",
        keywords: `categoria category filtrar ${c.label.toLowerCase()}`,
        icon: Receipt,
        run: () => {
          close();
          router.push(`/transactions?category=${encodeURIComponent(c.value)}`);
        },
      })),
      {
        id: "fx-usd",
        label: "Moneda base → USD",
        group: "Preferencias",
        keywords: "currency usd dolar",
        icon: Wallet,
        run: () => {
          setBaseCurrency("USD");
          close();
        },
      },
      {
        id: "fx-cop",
        label: "Moneda base → COP",
        group: "Preferencias",
        keywords: "currency cop peso",
        icon: Wallet,
        run: () => {
          setBaseCurrency("COP");
          close();
        },
      },
      {
        id: "fx-mxn",
        label: "Moneda base → MXN",
        group: "Preferencias",
        keywords: "currency mxn",
        icon: Wallet,
        run: () => {
          setBaseCurrency("MXN");
          close();
        },
      },
      {
        id: "fx-eur",
        label: "Moneda base → EUR",
        group: "Preferencias",
        keywords: "currency eur euro",
        icon: Wallet,
        run: () => {
          setBaseCurrency("EUR");
          close();
        },
      },
    ],
    [categories, close, focusQuickOrSheet, router, setBaseCurrency],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords.includes(q) ||
        c.group.toLowerCase().includes(q),
    );
  }, [commands, query]);

  useEffect(() => {
    const openPalette = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (!typing && !open && e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const detail = { handled: false };
        document.dispatchEvent(
          new CustomEvent("jera:focus-quick-entry", { detail }),
        );
        if (!detail.handled) openExpense();
        return;
      }

      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(filtered.length - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        filtered[active].run();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("jera:open-command", openPalette);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("jera:open-command", openPalette);
    };
  }, [open, close, filtered, active, openExpense]);

  useEffect(() => {
    if (open) {
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, query]);

  if (!open) return null;

  const groups = [...new Set(filtered.map((c) => c.group))];

  return (
    <div
      className="fc-overlay fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Menú de comandos"
    >
      <div
        className="fc-command-surface w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar comando…"
            className="h-12 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:inline">
            esc
          </kbd>
          <button
            type="button"
            onClick={close}
            className="fc-touch-target text-text-muted hover:text-text sm:hidden"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[min(60vh,22rem)] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-secondary">
              Sin resultados
            </p>
          ) : (
            groups.map((group) => (
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  {group}
                </p>
                <ul>
                  {filtered
                    .filter((c) => c.group === group)
                    .map((cmd) => {
                      const idx = filtered.indexOf(cmd);
                      const Icon = cmd.icon;
                      return (
                        <li key={cmd.id}>
                          <button
                            type="button"
                            onClick={cmd.run}
                            onMouseEnter={() => setActive(idx)}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                              idx === active
                                ? "bg-primary-soft text-text"
                                : "text-text-secondary hover:bg-surface-muted",
                            )}
                          >
                            <Icon
                              className="h-4 w-4 shrink-0 text-text-muted"
                              strokeWidth={1.75}
                            />
                            <span className="flex-1">{cmd.label}</span>
                            {cmd.hint ? (
                              <kbd className="rounded border border-border px-1.5 font-mono text-[10px] text-text-muted">
                                {cmd.hint}
                              </kbd>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-text-muted">
          <span>↑↓ navegar · ↵ ejecutar</span>
          <span className="hidden items-center gap-2 sm:flex">
            Moneda
            <BaseCurrencySwitcher />
          </span>
        </div>
      </div>
    </div>
  );
}

export function CommandTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        document.dispatchEvent(new Event("jera:open-command"));
      }}
      className={cn(
        "flex h-9 flex-1 items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-sm text-text-secondary transition hover:bg-surface lg:max-w-sm",
        className,
      )}
    >
      <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
      <span className="flex-1 text-left">Buscar o crear…</span>
      <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
        ⌘K
      </kbd>
    </button>
  );
}
