"use client";

import { createIncomeExpenseAction } from "@/app/actions/finance";
import { matchCategory, parseQuickEntry } from "@/lib/finance/quick-entry";
import { todayISODate } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils/cn";
import { ArrowUp, Check, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const STORAGE_KEY = "fincontrol:last-expense";

type Option = { value: string; label: string };

function readDefaults(): { accountId?: string; categoryId?: string } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeDefaults(accountId: string, categoryId: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accountId, categoryId }));
}

function hapticSuccess() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(12);
  }
}

export function QuickEntryBar({
  accounts,
  categories,
  className,
  variant = "default",
  showHints = true,
  onSuccess,
}: {
  accounts: Option[];
  categories: Option[];
  className?: string;
  variant?: "default" | "dock";
  showHints?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const categoryOptions = categories.map((c) => ({ id: c.value, name: c.label }));
  const disabled = accounts.length === 0 || categories.length === 0;

  function submit() {
    if (disabled || pending) return;

    const { amount, description } = parseQuickEntry(input);
    if (amount === null) {
      setError("Incluye un importe. Ej: Almuerzo $25");
      setSuccess(false);
      return;
    }

    const defaults = readDefaults();
    const accountId = defaults.accountId ?? accounts[0]?.value;
    const categoryId = matchCategory(description, categoryOptions, defaults.categoryId);

    if (!accountId || !categoryId) {
      setError("Necesitas al menos una cuenta y una categoría.");
      return;
    }

    const formData = new FormData();
    formData.set("type", "expense");
    formData.set("amount", String(amount));
    formData.set("description", description);
    formData.set("accountId", accountId);
    formData.set("categoryId", categoryId);
    formData.set("occurredOn", todayISODate());
    formData.set("_quick", "1");

    startTransition(async () => {
      setError(null);
      const result = await createIncomeExpenseAction({}, formData);
      if (result.error) {
        setError(result.error);
        setSuccess(false);
        return;
      }
      writeDefaults(accountId, categoryId);
      setInput("");
      setSuccess(true);
      hapticSuccess();
      router.refresh();
      onSuccess?.();
      setTimeout(() => setSuccess(false), 1800);
    });
  }

  const isDock = variant === "dock";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "group flex items-center gap-2 border border-border/80 bg-surface transition-[border-color,box-shadow,transform]",
          isDock ? "rounded-full px-3 py-2" : "rounded-xl px-3 py-2 shadow-[0_1px_0_rgba(0,0,0,0.03)]",
          success && "scale-[1.01] border-income/40",
          "focus-within:border-zinc-300 focus-within:shadow-[0_0_0_3px_rgba(9,9,11,0.04)]",
          disabled && "opacity-60",
        )}
      >
        {success ? (
          <Check className="h-4 w-4 shrink-0 text-income" strokeWidth={2} />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
        )}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          disabled={disabled || pending}
          placeholder={isDock ? "Almuerzo $25…" : 'Ej. "Almuerzo $25" o "Uber 12.50"'}
          className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          aria-label="Registrar gasto rápido"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || pending || !input.trim()}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300",
            isDock ? "h-10 w-10" : "h-9 w-9",
            success && "bg-income hover:bg-income",
          )}
          aria-label="Guardar gasto"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <ArrowUp className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </div>
      {error ? <p className="text-xs text-expense px-1">{error}</p> : null}
      {showHints && disabled ? (
        <p className="text-xs text-text-muted px-1">
          Crea una cuenta y categoría para usar la entrada rápida.
        </p>
      ) : null}
    </div>
  );
}
