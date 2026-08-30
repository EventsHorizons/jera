export function formatMoney(amount: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Add calendar days to YYYY-MM-DD (UTC). */
export function addDaysToISODate(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

/** Calendar month period in UTC date boundaries (YYYY-MM-DD). */
export function currentMonthPeriod(reference = new Date()) {
  const month = reference.getUTCMonth() + 1;
  const year = reference.getUTCFullYear();
  return { month, year, ...monthDateRange(month, year) };
}

export function previousMonthPeriod(reference = new Date()) {
  const d = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1),
  );
  return currentMonthPeriod(d);
}

export function monthDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endExclusive = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
  return { start, endExclusive };
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: "Bancaria",
  savings: "Ahorro",
  cash: "Efectivo",
  credit_card: "Tarjeta de crédito",
  wallet: "Billetera",
  loan: "Préstamo",
  other: "Otro",
};

export function natureForType(type: string): "asset" | "liability" {
  return type === "credit_card" || type === "loan" ? "liability" : "asset";
}

export type TxRow = {
  type: "income" | "expense" | "transfer" | "adjustment";
  amount: number;
  account_id: string | null;
  counterparty_account_id: string | null;
  adjustment_direction?: "increase" | "decrease" | null;
  is_settlement?: boolean | null;
  reimburses_transaction_id?: string | null;
};

export type AccountBalanceRow = {
  id: string;
  nature: "asset" | "liability";
  currency: string;
  status: string;
  current_balance: number;
  type?: string;
};

export type DebtRow = {
  id: string;
  status: string;
  original_amount: number;
  paid_amount: number;
  linked_account_id: string | null;
};

export function transactionEffectOnAccount(
  tx: TxRow,
  targetAccountId: string,
  nature: "asset" | "liability",
): number {
  const amount = Number(tx.amount);

  if (tx.type === "income" && tx.account_id === targetAccountId) {
    return nature === "asset" ? amount : -amount;
  }

  if (tx.type === "expense" && tx.account_id === targetAccountId) {
    return nature === "asset" ? -amount : amount;
  }

  if (tx.type === "transfer" && tx.account_id === targetAccountId) {
    return nature === "asset" ? -amount : amount;
  }

  if (tx.type === "transfer" && tx.counterparty_account_id === targetAccountId) {
    return nature === "asset" ? amount : -amount;
  }

  if (tx.type === "adjustment" && tx.account_id === targetAccountId) {
    return tx.adjustment_direction === "increase" ? amount : -amount;
  }

  return 0;
}

export function computeAccountBalance(
  initialBalance: number,
  nature: "asset" | "liability",
  accountId: string,
  transactions: TxRow[],
): number {
  const delta = transactions.reduce(
    (sum, tx) => sum + transactionEffectOnAccount(tx, accountId, nature),
    0,
  );
  return Number(initialBalance) + delta;
}

/** Money available to spend: active asset balances, grouped by currency. */
export function calculateAvailableMoney(accounts: AccountBalanceRow[]) {
  return sumByCurrency(
    accounts.filter((a) => a.status === "active" && a.nature === "asset"),
    (a) => Number(a.current_balance),
  );
}

/**
 * Total money across own asset accounts (same as available in this model).
 * Transfers between own accounts do not change this total within a currency.
 */
export function calculateTotalMoney(accounts: AccountBalanceRow[]) {
  return calculateAvailableMoney(accounts);
}

/** Liability account balances (credit cards, loans), by currency. */
export function calculateLiabilityBalances(accounts: AccountBalanceRow[]) {
  return sumByCurrency(
    accounts.filter((a) => a.status === "active" && a.nature === "liability"),
    (a) => Number(a.current_balance),
  );
}

export function calculateDebtBalance(debt: {
  original_amount: number;
  paid_amount: number;
}) {
  return Math.max(0, Number(debt.original_amount) - Number(debt.paid_amount));
}

/**
 * Pending personal debts, excluding those already represented by a linked
 * liability account (avoids double-counting in net worth).
 */
export function calculateStandaloneDebtPending(
  debts: DebtRow[],
  liabilityAccountIds: Set<string>,
) {
  return debts
    .filter((d) => d.status === "active")
    .filter(
      (d) =>
        !d.linked_account_id || !liabilityAccountIds.has(d.linked_account_id),
    )
    .reduce((sum, d) => sum + calculateDebtBalance(d), 0);
}

/**
 * Net worth by currency:
 * assets − liability accounts − standalone debts (no linked liability).
 * Standalone debts are attributed to the primary currency bucket when mixed.
 */
export function calculateNetWorth(
  accounts: AccountBalanceRow[],
  debts: DebtRow[],
  primaryCurrency = "USD",
) {
  const assets = calculateAvailableMoney(accounts);
  const liabilities = calculateLiabilityBalances(accounts);
  const liabilityIds = new Set(
    accounts
      .filter((a) => a.nature === "liability")
      .map((a) => a.id),
  );
  const standaloneDebt = calculateStandaloneDebtPending(debts, liabilityIds);

  const currencies = new Set([
    ...Object.keys(assets),
    ...Object.keys(liabilities),
    primaryCurrency,
  ]);

  const result: Record<string, number> = {};
  for (const currency of currencies) {
    const asset = assets[currency] ?? 0;
    const liability = liabilities[currency] ?? 0;
    const debtExtra = currency === primaryCurrency ? standaloneDebt : 0;
    result[currency] = asset - liability - debtExtra;
  }
  return result;
}

/** Ordinary income (excludes reimbursements). */
export function calculateIncome(
  transactions: TxRow[],
  opts?: { includeReimbursements?: boolean },
) {
  return transactions
    .filter((t) => t.type === "income")
    .filter((t) =>
      opts?.includeReimbursements
        ? true
        : !t.reimburses_transaction_id,
    )
    .reduce((s, t) => s + Number(t.amount), 0);
}

/**
 * Consumption expenses only.
 * Settlements (debt/CC payments recorded as expense historically) are excluded.
 */
export function calculateExpenses(transactions: TxRow[]) {
  return transactions
    .filter((t) => t.type === "expense")
    .filter((t) => !t.is_settlement)
    .reduce((s, t) => s + Number(t.amount), 0);
}

export function calculateReimbursements(transactions: TxRow[]) {
  return transactions
    .filter((t) => t.type === "income" && t.reimburses_transaction_id)
    .reduce((s, t) => s + Number(t.amount), 0);
}

/** Net consumption spend after reimbursements. */
export function calculateNetExpenses(transactions: TxRow[]) {
  return calculateExpenses(transactions) - calculateReimbursements(transactions);
}

/** Period savings flow = ordinary income − consumption expenses. */
export function calculateSavings(transactions: TxRow[]) {
  return calculateIncome(transactions) - calculateExpenses(transactions);
}

export function calculateBudgetUsage(limit: number, spent: number) {
  return budgetProgress(limit, spent);
}

export function calculateGoalProgress(current: number, target: number) {
  return goalProgress(current, target);
}

export function budgetProgress(limit: number, spent: number) {
  const remaining = limit - spent;
  const percent = limit > 0 ? Math.min(999, (spent / limit) * 100) : 0;
  return { remaining, percent, over: spent > limit };
}

export function goalProgress(current: number, target: number) {
  const remaining = Math.max(0, target - current);
  const percent = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return { remaining, percent, completed: current >= target };
}

/** Expense spend for budgets: non-settlement expenses only. */
export function calculateBudgetSpentByCategory(
  transactions: Array<TxRow & { category_id?: string | null }>,
) {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || tx.is_settlement || !tx.category_id) continue;
    map.set(
      tx.category_id,
      (map.get(tx.category_id) ?? 0) + Number(tx.amount),
    );
  }
  return map;
}

export function formatMoneyMap(
  amounts: Record<string, number>,
  fallbackCurrency = "USD",
) {
  const entries = Object.entries(amounts);
  if (entries.length === 0) return formatMoney(0, fallbackCurrency);
  return entries
    .map(([currency, amount]) => formatMoney(amount, currency))
    .join(" · ");
}

function sumByCurrency<T extends { currency: string }>(
  rows: T[],
  value: (row: T) => number,
) {
  const result: Record<string, number> = {};
  for (const row of rows) {
    const currency = row.currency || "USD";
    result[currency] = (result[currency] ?? 0) + value(row);
  }
  return result;
}

/**
 * Invariant helper: within one currency, transfers among own assets
 * must not change total asset money.
 */
export function totalAssetMoneyFromAccounts(accounts: AccountBalanceRow[]) {
  return calculateTotalMoney(accounts);
}
