"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useActionState } from "react";
import { createIncomeExpenseAction } from "@/app/actions/finance";
import { useBaseCurrencyOptional } from "@/components/finance/base-currency-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STORAGE_KEYS } from "@/lib/brand/constants";
import { todayISODate } from "@/lib/finance/calculations";
import { BASE_CURRENCIES } from "@/lib/finance/currencies";
import {
  convertAmountStrict,
  getClientFxRates,
} from "@/lib/finance/fx-client";
import type { ActionState } from "@/lib/utils/errors";
import { cn } from "@/lib/utils/cn";
import {
  Bus,
  Check,
  Coffee,
  Home,
  Plus,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wallet,
  Wifi,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Option = { value: string; label: string; currency?: string };

type CaptureApi = {
  open: () => void;
  close: () => void;
};

export type OptimisticExpense = {
  id: string;
  amount: number;
  currency: string;
  categoryLabel: string;
  description: string;
  createdAt: number;
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

function publishOptimistic(item: OptimisticExpense) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.optimisticExpenses);
    const list = raw ? (JSON.parse(raw) as OptimisticExpense[]) : [];
    const next = [item, ...list].slice(0, 8);
    sessionStorage.setItem(STORAGE_KEYS.optimisticExpenses, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent("jera:expense-optimistic", { detail: item }),
  );
}

function categoryIcon(label: string) {
  const n = label.toLowerCase();
  if (/comida|food|restaur|cafe|café/.test(n)) return Utensils;
  if (/transport|uber|gas|taxi|bus/.test(n)) return Bus;
  if (/casa|hogar|rent|alquiler|vivienda/.test(n)) return Home;
  if (/compra|shop|market|super/.test(n)) return ShoppingBag;
  if (/cafe|coffee|bebida/.test(n)) return Coffee;
  if (/internet|phone|tel|wifi|util/.test(n)) return Wifi;
  if (/ocio|entreten|cine|game/.test(n)) return Sparkles;
  return Wallet;
}

function validateAmount(value: string): string | null {
  if (!value.trim()) return "Ingresa un monto.";
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return "Monto inválido.";
  if (n <= 0) return "El monto debe ser mayor a 0.";
  if (n > 1_000_000_000) return "Monto demasiado alto.";
  return null;
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
      className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800 active:scale-95 sm:hidden"
      aria-label="Agregar gasto"
    >
      <Plus className="h-7 w-7" strokeWidth={1.75} />
    </button>
  );
}

function ExpenseSheet({
  accounts,
  categories,
  baseCurrency: baseCurrencyProp,
  onClose,
}: {
  accounts: Option[];
  categories: Option[];
  baseCurrency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const baseFromCtx = useBaseCurrencyOptional()?.baseCurrency;
  const baseCurrency = (baseFromCtx || baseCurrencyProp).toUpperCase();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [currencyOverride, setCurrencyOverride] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [fxPreview, setFxPreview] = useState<string | null>(null);
  const [fxError, setFxError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const currencyRef = useRef("");

  const defaults = useMemo(() => readDefaults(), []);
  const sortedCategories = useMemo(() => {
    const preferred = defaults.categoryId;
    if (!preferred) return categories;
    const hit = categories.find((c) => c.value === preferred);
    if (!hit) return categories;
    return [hit, ...categories.filter((c) => c.value !== preferred)];
  }, [categories, defaults.categoryId]);

  const resolvedAccount =
    accountId ||
    accounts.find((a) => a.value === defaults.accountId)?.value ||
    accounts[0]?.value ||
    "";
  const resolvedCategory =
    categoryId ||
    sortedCategories.find((c) => c.value === defaults.categoryId)?.value ||
    sortedCategories[0]?.value ||
    "";

  const accountCurrency =
    accounts.find((a) => a.value === resolvedAccount)?.currency ?? baseCurrency;
  const txCurrency = (currencyOverride || accountCurrency).toUpperCase();
  currencyRef.current = txCurrency;

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
    const err = amount ? validateAmount(amount) : null;
    setAmountError(err);
  }, [amount]);

  useEffect(() => {
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setFxPreview(null);
      setFxError(null);
      return;
    }
    if (txCurrency === baseCurrency) {
      setFxPreview(null);
      setFxError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rates = await getClientFxRates([txCurrency, baseCurrency]);
        const converted = convertAmountStrict(n, txCurrency, baseCurrency, rates);
        if (cancelled) return;
        if (converted == null) {
          setFxPreview(null);
          setFxError("Sin tasa para esta moneda. Prueba otra o usa la de la cuenta.");
          return;
        }
        setFxError(null);
        setFxPreview(
          `≈ ${converted.toLocaleString("es", { maximumFractionDigits: 2 })} ${baseCurrency}`,
        );
      } catch {
        if (!cancelled) {
          setFxPreview(null);
          setFxError("No se pudo obtener el tipo de cambio.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [amount, txCurrency, baseCurrency]);

  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      setLocalError(null);
      formData.set("type", "expense");
      formData.set("_quick", "1");

      const rawAmount = Number.parseFloat(String(formData.get("amount") ?? ""));
      const amountErr = validateAmount(String(formData.get("amount") ?? ""));
      if (amountErr) return { error: amountErr };

      const accId = String(formData.get("accountId") ?? "");
      const catId = String(formData.get("categoryId") ?? "");
      const accCurrency =
        accounts.find((a) => a.value === accId)?.currency ?? accountCurrency;
      const enteredCurrency = currencyRef.current || accCurrency.toUpperCase();
      let persistAmount = rawAmount;
      let persistCurrency = enteredCurrency;

      if (enteredCurrency !== accCurrency.toUpperCase()) {
        try {
          const rates = await getClientFxRates([enteredCurrency, accCurrency]);
          const converted = convertAmountStrict(
            rawAmount,
            enteredCurrency,
            accCurrency,
            rates,
          );
          if (converted == null) {
            return {
              error:
                "No hay tasa de cambio para convertir a la moneda de la cuenta.",
            };
          }
          persistAmount = Math.round(converted * 100) / 100;
          persistCurrency = accCurrency.toUpperCase();
          formData.set("amount", String(persistAmount));
        } catch {
          return {
            error: "Falló la conversión de moneda. Intenta de nuevo.",
          };
        }
      }

      const catLabel =
        categories.find((c) => c.value === catId)?.label ?? "Gasto";
      const optimisticId = `opt-${Date.now()}`;
      publishOptimistic({
        id: optimisticId,
        amount: rawAmount,
        currency: enteredCurrency,
        categoryLabel: catLabel,
        description: String(formData.get("description") || catLabel),
        createdAt: Date.now(),
      });

      // Instant success flash (optimistic) — roll back UI if server fails
      setSavedFlash(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(12);
        } catch {
          /* ignore */
        }
      }

      const result = await createIncomeExpenseAction(prev, formData);
      if (result.success) {
        const a = String(formData.get("accountId") ?? "");
        const c = String(formData.get("categoryId") ?? "");
        if (a && c) writeDefaults(a, c);
        router.refresh();
        window.setTimeout(() => {
          setSavedFlash(false);
          onClose();
        }, 650);
        return {
          success:
            result.success +
            (persistCurrency !== enteredCurrency
              ? ` (guardado ${persistAmount} ${persistCurrency})`
              : ""),
        };
      }

      setSavedFlash(false);
      setLocalError(result.error ?? "No se pudo guardar. Revisa e intenta.");
      return result;
    },
    {},
  );

  const amountNum = Number.parseFloat(amount);
  const canStep2 = !validateAmount(amount);
  const canConfirm =
    canStep2 &&
    Boolean(resolvedCategory && resolvedAccount) &&
    !fxError;

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
        if (sortedCategories[idx]) {
          setCategoryId(sortedCategories[idx].value);
          setStep(3);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, goNext, sortedCategories]);

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

  const displayError = localError || state.error;

  return (
    <SheetChrome onClose={onClose} title="Agregar gasto" step={step}>
      {displayError ? <Alert variant="error">{displayError}</Alert> : null}

      {savedFlash ? (
        <div className="flex flex-col items-center gap-3 py-10 duration-200">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success transition-transform duration-200 scale-100">
            <Check className="h-7 w-7" strokeWidth={2} />
          </span>
          <p className="text-sm font-medium text-text">
            Gastaste {amount} {txCurrency} en {categoryLabel}
          </p>
          {state.success ? (
            <p className="text-xs text-text-muted">{state.success}</p>
          ) : (
            <p className="text-xs text-text-muted">Guardando…</p>
          )}
        </div>
      ) : (
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="type" value="expense" />
          <input type="hidden" name="_quick" value="1" />
          <input type="hidden" name="amount" value={amount} />
          <input type="hidden" name="accountId" value={resolvedAccount} />
          <input type="hidden" name="categoryId" value={resolvedCategory} />
          <input
            type="hidden"
            name="description"
            value={description || categoryLabel}
          />
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
                  aria-invalid={Boolean(amountError)}
                  className="fc-hero-amount mt-2 w-full border-0 border-b-2 border-border bg-transparent pb-2 outline-none focus:border-primary"
                />
              </label>
              {amountError ? (
                <p className="text-xs text-danger">{amountError}</p>
              ) : null}
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
                <span className="fc-label">Moneda del gasto</span>
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
                <p className="text-sm text-text-muted">{fxPreview} (base)</p>
              ) : null}
              {fxError ? <p className="text-xs text-danger">{fxError}</p> : null}
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
              <p className="fc-label">Categoría · teclas 1–9</p>
              <div className="grid grid-cols-3 gap-2">
                {sortedCategories.slice(0, 9).map((cat, idx) => {
                  const Icon = categoryIcon(cat.label);
                  return (
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
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                      <span className="line-clamp-2">{cat.label}</span>
                      <span className="text-[10px] opacity-50">{idx + 1}</span>
                    </button>
                  );
                })}
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
                  −
                  {Number(amountNum).toLocaleString("es", {
                    minimumFractionDigits: 2,
                  })}{" "}
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
                  disabled={!canConfirm || pending}
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
  return <div className="space-y-4 animate-[fc-fade_160ms_ease-out]">{children}</div>;
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
        className="fc-card max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 sm:rounded-2xl sm:p-6"
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
