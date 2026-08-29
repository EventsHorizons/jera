import { describe, expect, it } from "vitest";
import {
  calculateAvailableMoney,
  calculateExpenses,
  calculateIncome,
  calculateNetExpenses,
  calculateNetWorth,
  calculateSavings,
  calculateStandaloneDebtPending,
  computeAccountBalance,
  transactionEffectOnAccount,
} from "@/lib/finance/calculations";

describe("transactionEffectOnAccount", () => {
  it("increases asset on income", () => {
    expect(
      transactionEffectOnAccount(
        {
          type: "income",
          amount: 100,
          account_id: "a1",
          counterparty_account_id: null,
        },
        "a1",
        "asset",
      ),
    ).toBe(100);
  });

  it("decreases asset on expense", () => {
    expect(
      transactionEffectOnAccount(
        {
          type: "expense",
          amount: 40,
          account_id: "a1",
          counterparty_account_id: null,
        },
        "a1",
        "asset",
      ),
    ).toBe(-40);
  });

  it("credit card purchase increases liability and keeps bank unchanged", () => {
    const purchase = {
      type: "expense" as const,
      amount: 200,
      account_id: "card",
      counterparty_account_id: null,
    };
    expect(transactionEffectOnAccount(purchase, "card", "liability")).toBe(200);
    expect(transactionEffectOnAccount(purchase, "bank", "asset")).toBe(0);
  });

  it("credit card payment reduces bank and liability without being an expense", () => {
    const payment = {
      type: "transfer" as const,
      amount: 200,
      account_id: "bank",
      counterparty_account_id: "card",
      is_settlement: true,
    };
    expect(transactionEffectOnAccount(payment, "bank", "asset")).toBe(-200);
    expect(transactionEffectOnAccount(payment, "card", "liability")).toBe(-200);
  });

  it("moves money on transfer without changing net assets", () => {
    const tx = {
      type: "transfer" as const,
      amount: 50,
      account_id: "from",
      counterparty_account_id: "to",
    };
    expect(transactionEffectOnAccount(tx, "from", "asset")).toBe(-50);
    expect(transactionEffectOnAccount(tx, "to", "asset")).toBe(50);
  });
});

describe("transfer total invariant", () => {
  it("keeps total money constant after transfer", () => {
    const accounts = [
      {
        id: "a",
        nature: "asset" as const,
        currency: "USD",
        status: "active",
        current_balance: 1000,
      },
      {
        id: "b",
        nature: "asset" as const,
        currency: "USD",
        status: "active",
        current_balance: 500,
      },
    ];
    expect(calculateAvailableMoney(accounts).USD).toBe(1500);

    const after = [
      { ...accounts[0]!, current_balance: 700 },
      { ...accounts[1]!, current_balance: 800 },
    ];
    expect(calculateAvailableMoney(after).USD).toBe(1500);
  });
});

describe("computeAccountBalance", () => {
  it("starts from initial balance and applies effects", () => {
    const balance = computeAccountBalance(1000, "asset", "a1", [
      {
        type: "income",
        amount: 200,
        account_id: "a1",
        counterparty_account_id: null,
      },
      {
        type: "expense",
        amount: 50,
        account_id: "a1",
        counterparty_account_id: null,
      },
    ]);
    expect(balance).toBe(1150);
  });
});

describe("income expense savings and reimbursements", () => {
  const txs = [
    {
      type: "income" as const,
      amount: 1000,
      account_id: "a",
      counterparty_account_id: null,
    },
    {
      type: "expense" as const,
      amount: 100,
      account_id: "a",
      counterparty_account_id: null,
    },
    {
      type: "income" as const,
      amount: 40,
      account_id: "a",
      counterparty_account_id: null,
      reimburses_transaction_id: "exp1",
    },
    {
      type: "transfer" as const,
      amount: 50,
      account_id: "a",
      counterparty_account_id: "b",
    },
    {
      type: "expense" as const,
      amount: 20,
      account_id: "a",
      counterparty_account_id: null,
      is_settlement: true,
    },
  ];

  it("excludes transfers and settlements from expenses", () => {
    expect(calculateExpenses(txs)).toBe(100);
  });

  it("excludes reimbursements from ordinary income", () => {
    expect(calculateIncome(txs)).toBe(1000);
  });

  it("computes net expenses after reimbursements", () => {
    expect(calculateNetExpenses(txs)).toBe(60);
  });

  it("computes savings as ordinary income minus consumption expenses", () => {
    expect(calculateSavings(txs)).toBe(900);
  });
});

describe("net worth", () => {
  it("does not double-count linked liability debts", () => {
    const accounts = [
      {
        id: "bank",
        nature: "asset" as const,
        currency: "USD",
        status: "active",
        current_balance: 1000,
      },
      {
        id: "card",
        nature: "liability" as const,
        currency: "USD",
        status: "active",
        current_balance: 200,
      },
    ];
    const debts = [
      {
        id: "d1",
        status: "active",
        original_amount: 200,
        paid_amount: 0,
        linked_account_id: "card",
      },
      {
        id: "d2",
        status: "active",
        original_amount: 100,
        paid_amount: 20,
        linked_account_id: null,
      },
    ];

    expect(
      calculateStandaloneDebtPending(debts, new Set(["card"])),
    ).toBe(80);
    expect(calculateNetWorth(accounts, debts, "USD").USD).toBe(720);
  });
});

describe("multi-currency", () => {
  it("keeps currencies separate without conversion", () => {
    const accounts = [
      {
        id: "1",
        nature: "asset" as const,
        currency: "USD",
        status: "active",
        current_balance: 100,
      },
      {
        id: "2",
        nature: "asset" as const,
        currency: "MXN",
        status: "active",
        current_balance: 500,
      },
    ];
    const available = calculateAvailableMoney(accounts);
    expect(available.USD).toBe(100);
    expect(available.MXN).toBe(500);
  });
});
