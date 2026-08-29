"use client";

import { createIncomeExpenseAction } from "@/app/actions/finance";
import { useBaseCurrencyOptional } from "@/components/finance/base-currency-provider";
import { STORAGE_KEYS } from "@/lib/brand/constants";
import { todayISODate } from "@/lib/finance/calculations";
import {
  convertAmountStrict,
  getClientFxRates,
} from "@/lib/finance/fx-client";
import {
  matchCategory,
  parseQuickEntry,
} from "@/lib/finance/quick-entry";
import { cn } from "@/lib/utils/cn";
import { Calendar, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type AccountOpt = { value: string; label: string; currency?: string };
type CategoryOpt = { value: string; label: string };

type Defaults = { accountId?: string; categoryId?: string };

function readDefaults(): Defaults {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEYS.lastExpense) ?? "{}",
    ) as Defaults;
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

function publishOptimistic(item: {
  id: string;
  amount: number;
  currency: string;
  categoryLabel: string;
  description: string;
  createdAt: number;
}) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.optimisticExpenses);
    const list = raw ? (JSON.parse(raw) as typeof item[]) : [];
    sessionStorage.setItem(
      STORAGE_KEYS.optimisticExpenses,
      JSON.stringify([item, ...list].slice(0, 8)),
    );
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent("jera:expense-optimistic", { detail: item }),
  );
}

export function QuickEntryBar({
  accounts,
  categories,
  baseCurrency: baseCurrencyProp = "USD",
}: {
  accounts: AccountOpt[];
  categories: CategoryOpt[];
  baseCurrency?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const baseFromCtx = useBaseCurrencyOptional()?.baseCurrency;
  const baseCurrency = (baseFromCtx || baseCurrencyProp).toUpperCase();

  const [text, setText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showDate, setShowDate] = useState(false);
  const [occurredOn, setOccurredOn] = useState(todayISODate());
  const [fxPreview, setFxPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const defaults = useMemo(() => readDefaults(), []);
  const accountId =
    accounts.find((a) => a.value === defaults.accountId)?.value ||
    accounts[0]?.value ||
    "";
  const accountCurrency = (
    accounts.find((a) => a.value === accountId)?.currency ?? baseCurrency
  ).toUpperCase();

  const parsed = useMemo(() => parseQuickEntry(text), [text]);
  const enteredCurrency = (parsed.currency || accountCurrency).toUpperCase();

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({ id: c.value, name: c.label })),
    [categories],
  );

  const resolvedCategory =
    categoryId ||
    matchCategory(parsed.description, categoryOptions, defaults.categoryId) ||
    categories[0]?.value ||
    "";

  useEffect(() => {
    const onFocus = (e: Event) => {
      const detail = (e as CustomEvent<{ handled?: boolean }>).detail;
      if (detail && typeof detail === "object") detail.handled = true;
      inputRef.current?.focus();
    };
    document.addEventListener("jera:focus-quick-entry", onFocus);
    return () =>
      document.removeEventListener("jera:focus-quick-entry", onFocus);
  }, []);

  useEffect(() => {
    if (!parsed.amount || enteredCurrency === baseCurrency) {
      setFxPreview(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rates = await getClientFxRates([enteredCurrency, baseCurrency]);
        const converted = convertAmountStrict(
          parsed.amount!,
          enteredCurrency,
          baseCurrency,
          rates,
        );
        if (cancelled || converted == null) {
          if (!cancelled) setFxPreview(null);
          return;
        }
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
  }, [parsed.amount, enteredCurrency, baseCurrency]);

  const submit = useCallback(
    async (catOverride?: string) => {
      setError(null);
      const { amount, description, currency } = parseQuickEntry(text);
      if (amount == null) {
        setError("Indica un monto (ej. 25 o Café 12.50 COP).");
        return;
      }
      if (!accountId) {
        setError("Necesitas una cuenta activa.");
        return;
      }
      const catId =
        catOverride ||
        categoryId ||
        matchCategory(description, categoryOptions, defaults.categoryId) ||
        categories[0]?.value;
      if (!catId) {
        setError("Selecciona una categoría.");
        return;
      }

      const catLabel =
        categories.find((c) => c.value === catId)?.label ?? "Gasto";
      const entered = (currency || accountCurrency).toUpperCase();
      let persistAmount = amount;
      let persistCurrency = entered;

      if (entered !== accountCurrency) {
        try {
          const rates = await getClientFxRates([entered, accountCurrency]);
          const converted = convertAmountStrict(
            amount,
            entered,
            accountCurrency,
            rates,
          );
          if (converted == null) {
            setError("Sin tasa de cambio para esa moneda.");
            return;
          }
          persistAmount = Math.round(converted * 100) / 100;
          persistCurrency = accountCurrency;
        } catch {
          setError("No se pudo convertir la moneda.");
          return;
        }
      }

      publishOptimistic({
        id: `opt-${Date.now()}`,
        amount,
        currency: entered,
        categoryLabel: catLabel,
        description: description || catLabel,
        createdAt: Date.now(),
      });

      const fd = new FormData();
      fd.set("type", "expense");
      fd.set("_quick", "1");
      fd.set("amount", String(persistAmount));
      fd.set("accountId", accountId);
      fd.set("categoryId", catId);
      fd.set("description", description || catLabel);
      fd.set("occurredOn", occurredOn || todayISODate());

      startTransition(async () => {
        const result = await createIncomeExpenseAction({}, fd);
        if (result.success) {
          writeDefaults(accountId, catId);
          setFlash(
            persistCurrency !== entered
              ? `Guardado ${persistAmount} ${persistCurrency}`
              : `Gastaste ${amount} ${entered} · ${catLabel}`,
          );
          setText("");
          setCategoryId("");
          setOccurredOn(todayISODate());
          setShowDate(false);
          router.refresh();
          window.setTimeout(() => setFlash(null), 1800);
        } else {
          setError(result.error ?? "No se pudo guardar.");
        }
      });
    },
    [
      text,
      accountId,
      accountCurrency,
      categoryId,
      categoryOptions,
      categories,
      defaults.categoryId,
      occurredOn,
      router,
    ],
  );

  if (accounts.length === 0 || categories.length === 0) {
    return null;
  }

  const top = categories.slice(0, 6);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <div
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg bg-zinc-50 px-3 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-action/20",
              error && "ring-2 ring-rose-200",
            )}
          >
            <span className="font-mono text-sm text-zinc-300">
              {enteredCurrency}
            </span>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="25 · Café COP · Uber 12.50"
              disabled={pending}
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              aria-label="Registro rápido de gasto"
            />
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
            ) : (
              <kbd className="hidden rounded border border-zinc-200 bg-white px-1.5 font-mono text-[10px] text-zinc-400 sm:inline">
                ↵
              </kbd>
            )}
          </div>
          {fxPreview ? (
            <p className="mt-1 px-1 text-[11px] text-zinc-400">{fxPreview}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowDate((v) => !v)}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-xs text-zinc-600 transition hover:bg-zinc-50",
            showDate && "border-action/40 bg-action-soft text-action",
          )}
          aria-label="Fecha opcional"
        >
          <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Fecha</span>
        </button>
      </div>

      {showDate ? (
        <div className="mt-2 px-1">
          <input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none focus:border-zinc-300"
          />
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1.5 px-0.5">
        {top.map((c) => {
          const active = resolvedCategory === c.value;
          return (
            <button
              key={c.value}
              type="button"
              disabled={pending}
              onClick={() => {
                setCategoryId(c.value);
                if (parsed.amount != null) void submit(c.value);
              }}
              className={cn(
                "h-8 rounded-full border px-2.5 text-xs transition",
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-2 px-1 text-xs text-rose-600">{error}</p>
      ) : null}
      {flash ? (
        <p className="mt-2 px-1 text-xs text-emerald-600">{flash}</p>
      ) : null}
    </div>
  );
}

export function QuickEntrySkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-2">
      <div className="h-10 rounded-lg bg-zinc-100" />
      <div className="mt-2 flex gap-1.5">
        <div className="h-8 w-16 rounded-full bg-zinc-100" />
        <div className="h-8 w-20 rounded-full bg-zinc-100" />
        <div className="h-8 w-14 rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}
