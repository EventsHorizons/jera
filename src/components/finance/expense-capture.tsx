"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useActionState } from "react";
import { createIncomeExpenseAction } from "@/app/actions/finance";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BASE_CURRENCIES } from "@/lib/finance/currencies";
import { todayISODate } from "@/lib/finance/calculations";
import { STORAGE_KEYS } from "@/lib/brand/constants";
import type { ActionState } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";
import { Check, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Option = { value: string; label: string; currency?: string };

type CaptureApi = {
  open: () => void;
  close: () => void;
};

const CaptureContext = createContext<CaptureApi | null>(null);

export function useExpenseCapture() {
  const ctx = useContext(CaptureContext);
  if (!ctx) {
    throw new Error("useExpenseCapture must be used within ExpenseCaptureProvider");
  }
  return ctx;
}

type Defaults = { accountId?: string; categoryId?: string };

function readDefaults(): Defaults {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.lastExpense) ?? "{}") as Defaults;
  } catch {
    return {};
  }
}

function writeDefaults(accountId: string, categoryId: string) {
  localStorage.setItem(
    STORAGE_KEYS.lastExpense,
    JSON.stringify({ accountId, categoryId }),
  );
}

const QUICK_AMOUNTS = [5, 10, 20, 50];

export function ExpenseCaptureProvider({
  accounts,
  categories,
  baseCurrency = "USD",
  children,
}: {
  accounts: Option[];
  categories: Option[];
  baseCurrency?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const api = useMemo<CaptureApi>(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
    }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CaptureContext.Provider value={api}>
      {children}
      {open ? (
        <ExpenseSheet
          accounts={accounts}
          categories={categories}
          baseCurrency={baseCurrency}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </CaptureContext.Provider>
  );
}

export function ExpenseCaptureButton({
  className,
  label = "+ Agregar gasto",
}: {
  className?: string;
  label?: string;
}) {
  const { open } = useExpenseCapture();
  return (
    <Button type="button" onClick={open} className={cn("gap-2", className)}>
      {label}
    </Button>
  );
}

export function ExpenseCaptureFab() {
  const { open } = useExpenseCapture();
  return (
    <button
      type="button"
      onClick={open}
      className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-zinc-800 active:scale-95 sm:hidden"
      aria-label="Agregar gasto"
    >
      <Plus className="h-7 w-7" strokeWidth={1.75} />
    </button>
  );
}

function ExpenseSheet({
  accounts,
  categories,
  baseCurrency,
  onClose,
}: {
  accounts: Option[];
  categories: Option[];
  baseCurrency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [currencyOverride, setCurrencyOverride] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [fxPreview, setFxPreview] = useState<string | null>(null);

  const defaults = useMemo(() => readDefaults(), []);
  const resolvedAccount =
    accountId ||
    accounts.find((a) => a.value === defaults.accountId)?.value ||
    accounts[0]?.value ||
    "";
  const resolvedCategory =
    categoryId ||
    categories.find((c) => c.value === defaults.categoryId)?.value ||
    categories[0]?.value ||
    "";

  const accountCurrency =
    accounts.find((a) => a.value === resolvedAccount)?.currency ?? baseCurrency;
  const txCurrency = (currencyOverride || accountCurrency).toUpperCase();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0 || txCurrency === baseCurrency) {
      setFxPreview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/fx?symbols=${txCurrency},${baseCurrency}`);
        if (!res.ok) return;
        const data = (await res.json()) as { rates: Record<string, number> };
        const rates = data.rates ?? {};
        const fromRate = txCurrency === "USD" ? 1 : rates[txCurrency];
        const toRate = baseCurrency === "USD" ? 1 : rates[baseCurrency];
        if (!fromRate || !toRate || cancelled) return;
        const converted = (n / fromRate) * toRate;
        setFxPreview(
          `≈ ${converted.toLocaleString("es", { maximumFractionDigits: 2 })} ${baseCurrency}`,
        );
      } catch {
        if (!cancelled) setFxPreview(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amount, txCurrency, baseCurrency]);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      formData.set("type", "expense");
      formData.set("_quick", "1");

      const rawAmount = Number.parseFloat(String(formData.get("amount") ?? ""));
      const accId = String(formData.get("accountId") ?? "");
      const accCurrency =
        accounts.find((a) => a.value === accId)?.currency ?? accountCurrency;
      const enteredCurrency = (currencyOverride || accCurrency).toUpperCase();

      if (
        Number.isFinite(rawAmount) &&
        rawAmount > 0 &&
        enteredCurrency !== accCurrency.toUpperCase()
      ) {
        try {
          const res = await fetch(
            `/api/fx?symbols=${enteredCurrency},${accCurrency}`,
          );
          if (res.ok) {
            const data = (await res.json()) as { rates: Record<string, number> };
            const rates = data.rates ?? {};
            const fromRate = enteredCurrency === "USD" ? 1 : rates[enteredCurrency];
            const toRate =
              accCurrency.toUpperCase() === "USD" ? 1 : rates[accCurrency.toUpperCase()];
            if (fromRate && toRate) {
              const converted = (rawAmount / fromRate) * toRate;
              formData.set("amount", String(Math.round(converted * 100) / 100));
            }
          }
        } catch {
          /* keep original amount if FX fails */
        }
      }

      const result = await createIncomeExpenseAction(prev, formData);
      if (result.success) {
        const a = String(formData.get("accountId") ?? "");
        const c = String(formData.get("categoryId") ?? "");
        if (a && c) writeDefaults(a, c);
        setSavedFlash(true);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate?.(12);
          } catch {
            /* ignore */
          }
        }
        router.refresh();
        window.setTimeout(() => {
          setSavedFlash(false);
          onClose();
        }, 700);
      }
      return result;
    },
    {},
  );

  const amountNum = Number.parseFloat(amount);
  const canStep2 = Number.isFinite(amountNum) && amountNum > 0;
  const canConfirm = canStep2 && Boolean(resolvedCategory && resolvedAccount);

  const categoryLabel =
    categories.find((c) => c.value === resolvedCategory)?.label ?? "Categoría";
  const accountLabel =
    accounts.find((a) => a.value === resolvedAccount)?.label ?? "Cuenta";

  const goNext = useCallback(() => {
    if (step === 1 && canStep2) setStep(2);
    else if (step === 2 && resolvedCategory) setStep(3);
  }, [step, canStep2, resolvedCategory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && step < 3) {
        e.preventDefault();
        goNext();
      }
      if (step === 2 && e.key >= "1" && e.key <= "9") {
        const idx = Number(e.key) - 1;
        if (categories[idx]) {
          setCategoryId(categories[idx].value);
          setStep(3);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, goNext, categories]);

  if (accounts.length === 0 || categories.length === 0) {
    return (
      <SheetChrome onClose={onClose} title="Agregar gasto">
        <p className="text-sm text-text-secondary">
          Crea una cuenta y espera a que se carguen las categorías para registrar
          gastos.
        </p>
      </SheetChrome>
    );
  }

  return (
    <SheetChrome onClose={onClose} title="Agregar gasto" step={step}>
      {state.error ? <Alert variant="error">{state.error}</Alert> : null}

      {savedFlash ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <Check className="h-7 w-7" strokeWidth={2} />
          </span>
          <p className="text-sm font-medium text-text">
            Gastaste {amount} {txCurrency} en {categoryLabel}
          </p>
          {state.success ? (
            <p className="text-xs text-text-muted">{state.success}</p>
          ) : null}
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="type" value="expense" />
          <input type="hidden" name="_quick" value="1" />
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="accountId" value={resolvedAccount} />
          <input type="hidden" name="categoryId" value={resolvedCategory} />
          <input type="hidden" name="description" value={description || categoryLabel} />
          <input type="hidden" name="occurredOn" value={todayISODate()} />

          {step === 1 ? (
            <StackStep>
              <label className="block">
                <span className="fc-label">¿Cuánto?</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="fc-hero-amount mt-2 w-full border-0 border-b-2 border-border bg-transparent pb-2 outline-none focus:border-primary"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setAmount(String(n))}
                    className="h-9 rounded-full border border-border/80 px-3 text-sm text-text-secondary transition hover:bg-surface-muted active:scale-95"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <label className="block text-sm">
                <span className="fc-label">Moneda</span>
                <select
                  value={txCurrency}
                  onChange={(e) => setCurrencyOverride(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border/80 bg-surface px-3 text-text"
                >
                  {BASE_CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              {fxPreview ? (
                <p className="text-sm text-text-muted">{fxPreview} (moneda base)</p>
              ) : null}
              <Button
                type="button"
                className="w-full"
                disabled={!canStep2}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </StackStep>
          ) : null}

          {step === 2 ? (
            <StackStep>
              <p className="fc-label">Categoría</p>
              <div className="grid grid-cols-3 gap-2">
                {categories.slice(0, 9).map((cat, idx) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.value);
                      setStep(3);
                    }}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition active:scale-95",
                      resolvedCategory === cat.value
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-border/80 bg-surface text-text hover:bg-surface-muted",
                    )}
                  >
                    <span className="line-clamp-2">{cat.label}</span>
                    <span className="text-[10px] opacity-50">{idx + 1}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="text-sm text-text-secondary"
                onClick={() => setStep(1)}
              >
                ← Volver al monto
              </button>
            </StackStep>
          ) : null}

          {step === 3 ? (
            <StackStep>
              <div className="rounded-2xl border border-border/80 bg-surface-muted/40 px-4 py-4">
                <p className="fc-mono-amount text-3xl font-semibold tracking-tight">
                  −{Number(amountNum).toLocaleString("es", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-base font-medium text-text-muted">
                    {txCurrency}
                  </span>
                </p>
                {fxPreview ? (
                  <p className="mt-1 text-sm text-text-muted">{fxPreview}</p>
                ) : null}
                <p className="mt-3 text-sm text-text">
                  {categoryLabel}
                  <span className="text-text-muted"> · {accountLabel}</span>
                </p>
              </div>

              <label className="block text-sm">
                <span className="fc-label">Cuenta</span>
                <select
                  value={resolvedAccount}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border/80 bg-surface px-3"
                >
                  {accounts.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="text-sm text-text-secondary"
              >
                {showDetails ? "− Menos detalles" : "+ Descripción"}
              </button>
              {showDetails ? (
                <Input
                  name="descriptionVisible"
                  label="Descripción"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              ) : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStep(2)}
                >
                  Atrás
                </Button>
                <Button
                  type="submit"
                  className="flex-[2]"
                  loading={pending}
                  disabled={!canConfirm}
                >
                  Confirmar
                </Button>
              </div>
            </StackStep>
          ) : null}
        </form>
      )}
    </SheetChrome>
  );
}

function StackStep({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function SheetChrome({
  children,
  onClose,
  title,
  step,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
  step?: 1 | 2 | 3;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-900/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="fc-card max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 shadow-lg sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {step ? (
              <p className="mt-0.5 text-xs text-text-muted">
                Paso {step} de 3
                <span className="ml-2 hidden text-text-muted sm:inline">
                  · ⌘K · Enter · Esc
                </span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="fc-touch-target rounded-full text-text-muted hover:bg-surface-muted hover:text-text"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
