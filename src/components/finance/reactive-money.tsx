"use client";

import { useBaseCurrency } from "@/components/finance/base-currency-provider";
import type { OptimisticExpense } from "@/components/finance/expense-capture";
import { STORAGE_KEYS } from "@/lib/brand/constants";
import { formatMoney } from "@/lib/finance/calculations";
import {
  convertAmountStrict,
  getClientFxRates,
  peekCachedRates,
} from "@/lib/finance/fx-client";
import { useEffect, useMemo, useState } from "react";

type BalanceRow = { amount: number; currency: string };

export function ReactiveMoneyCards({
  available,
  monthExpense,
  monthIncome,
  todayExpense,
}: {
  available: BalanceRow[];
  monthExpense: BalanceRow[];
  monthIncome: BalanceRow[];
  todayExpense: BalanceRow[];
}) {
  const { baseCurrency, pending } = useBaseCurrency();
  const [rates, setRates] = useState(peekCachedRates());

  useEffect(() => {
    const symbols = [
      ...available,
      ...monthExpense,
      ...monthIncome,
      ...todayExpense,
    ].map((r) => r.currency);
    getClientFxRates([...symbols, baseCurrency])
      .then(setRates)
      .catch(() => undefined);
  }, [baseCurrency, available, monthExpense, monthIncome, todayExpense]);

  const sum = (rows: BalanceRow[]) =>
    rows.reduce((acc, row) => {
      const v = convertAmountStrict(row.amount, row.currency, baseCurrency, rates);
      return acc + (v ?? row.amount);
    }, 0);

  const a = sum(available);
  const e = sum(monthExpense);
  const i = sum(monthIncome);
  const t = sum(todayExpense);

  return (
    <div className="fc-metric-grid">
      <Metric
        label="Disponible"
        value={formatMoney(a, baseCurrency)}
        hint={pending ? "Recalculando…" : undefined}
      />
      <Metric
        label="Gastaste este mes"
        value={formatMoney(e, baseCurrency)}
        subtitle={`Hoy: ${formatMoney(t, baseCurrency)}`}
        tone="expense"
      />
      <Metric
        label="Ingresos del mes"
        value={formatMoney(i, baseCurrency)}
        tone="income"
      />
    </div>
  );
}

function Metric({
  label,
  value,
  subtitle,
  hint,
  tone,
}: {
  label: string;
  value: string;
  subtitle?: string;
  hint?: string;
  tone?: "expense" | "income";
}) {
  return (
    <div className="fc-panel space-y-2">
      <p className="fc-label">{label}</p>
      <p
        className={`fc-mono-amount text-2xl font-semibold tracking-tight ${
          tone === "expense"
            ? "text-expense"
            : tone === "income"
              ? "text-income"
              : "text-text"
        }`}
      >
        {value}
      </p>
      {subtitle ? (
        <p className="text-xs text-text-muted">{subtitle}</p>
      ) : null}
      {hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

export function OptimisticActivityRail() {
  const [items, setItems] = useState<OptimisticExpense[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.optimisticExpenses);
      if (raw) setItems(JSON.parse(raw) as OptimisticExpense[]);
    } catch {
      /* ignore */
    }
    const onOpt = (e: Event) => {
      const detail = (e as CustomEvent<OptimisticExpense>).detail;
      if (!detail) return;
      setItems((prev) => [detail, ...prev].slice(0, 8));
    };
    window.addEventListener("jera:expense-optimistic", onOpt);
    return () => window.removeEventListener("jera:expense-optimistic", onOpt);
  }, []);

  const fresh = useMemo(
    () => items.filter((i) => Date.now() - i.createdAt < 60_000),
    [items],
  );

  if (fresh.length === 0) return null;

  return (
    <ul className="space-y-2">
      {fresh.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded-xl border border-dashed border-border/80 bg-surface-muted/40 px-3 py-2 text-sm"
        >
          <span className="truncate text-text-secondary">
            {item.description || item.categoryLabel}
            <span className="ml-2 text-[10px] uppercase text-text-muted">
              pendiente
            </span>
          </span>
          <span className="fc-mono-amount shrink-0 font-medium text-expense">
            −{formatMoney(item.amount, item.currency)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="fc-bento-grid animate-pulse">
      <div className="col-span-12 space-y-4 lg:col-span-8">
        <div className="h-8 w-40 rounded-lg bg-surface-muted" />
        <div className="h-28 rounded-2xl bg-surface-muted" />
        <div className="fc-metric-grid">
          <div className="h-24 rounded-2xl bg-surface-muted" />
          <div className="h-24 rounded-2xl bg-surface-muted" />
          <div className="h-24 rounded-2xl bg-surface-muted" />
        </div>
      </div>
      <div className="col-span-12 space-y-3 lg:col-span-4">
        <div className="h-6 w-32 rounded bg-surface-muted" />
        <div className="h-14 rounded-xl bg-surface-muted" />
        <div className="h-14 rounded-xl bg-surface-muted" />
      </div>
    </div>
  );
}
