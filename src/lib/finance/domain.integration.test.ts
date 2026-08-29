import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceRoleKey);

describe.skipIf(!canRun)("financial domain invariants", () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = "Password1";
  const email = `domain-${Date.now()}@example.com`;
  let userId = "";
  let bankId = "";
  let cashId = "";
  let cardId = "";
  let expenseCat = "";
  let incomeCat = "";

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("credit card purchase and payment without double expense", async () => {
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Domain User" },
    });
    userId = created.user!.id;

    const client = createClient(url!, anonKey!);
    await client.auth.signInWithPassword({ email, password });

    const { data: bank } = await client
      .from("financial_accounts")
      .insert({
        user_id: userId,
        name: "Bank",
        type: "bank",
        nature: "asset",
        currency: "USD",
        initial_balance: 1000,
      })
      .select("id")
      .single();
    bankId = bank!.id;

    const { data: cash } = await client
      .from("financial_accounts")
      .insert({
        user_id: userId,
        name: "Cash",
        type: "cash",
        nature: "asset",
        currency: "USD",
        initial_balance: 500,
      })
      .select("id")
      .single();
    cashId = cash!.id;

    const { data: card } = await client
      .from("financial_accounts")
      .insert({
        user_id: userId,
        name: "Visa",
        type: "credit_card",
        nature: "liability",
        currency: "USD",
        initial_balance: 0,
      })
      .select("id")
      .single();
    cardId = card!.id;

    const { data: cats } = await client
      .from("categories")
      .select("id, kind, name")
      .eq("user_id", userId);
    expenseCat = cats!.find((c) => c.kind === "expense")!.id;
    incomeCat = cats!.find((c) => c.kind === "income")!.id;

    const today = new Date().toISOString().slice(0, 10);

    // Transfer keeps total assets
    await client.from("transactions").insert({
      user_id: userId,
      type: "transfer",
      amount: 300,
      account_id: bankId,
      counterparty_account_id: cashId,
      occurred_on: today,
      transfer_group_id: crypto.randomUUID(),
    });

    const { data: bankAfterTransfer } = await client.rpc("get_account_balance", {
      p_account_id: bankId,
    });
    const { data: cashAfterTransfer } = await client.rpc("get_account_balance", {
      p_account_id: cashId,
    });
    expect(Number(bankAfterTransfer) + Number(cashAfterTransfer)).toBe(1500);

    // CC purchase
    await client.from("transactions").insert({
      user_id: userId,
      type: "expense",
      amount: 200,
      account_id: cardId,
      category_id: expenseCat,
      occurred_on: today,
    });

    const { data: bankAfterPurchase } = await client.rpc("get_account_balance", {
      p_account_id: bankId,
    });
    const { data: cardAfterPurchase } = await client.rpc("get_account_balance", {
      p_account_id: cardId,
    });
    expect(Number(bankAfterPurchase)).toBe(700);
    expect(Number(cardAfterPurchase)).toBe(200);

    // CC payment as settlement transfer
    await client.from("transactions").insert({
      user_id: userId,
      type: "transfer",
      amount: 200,
      account_id: bankId,
      counterparty_account_id: cardId,
      occurred_on: today,
      transfer_group_id: crypto.randomUUID(),
      is_settlement: true,
    });

    const { data: bankAfterPay } = await client.rpc("get_account_balance", {
      p_account_id: bankId,
    });
    const { data: cardAfterPay } = await client.rpc("get_account_balance", {
      p_account_id: cardId,
    });
    expect(Number(bankAfterPay)).toBe(500);
    expect(Number(cardAfterPay)).toBe(0);

    const { data: expenses } = await client
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "expense");
    expect(expenses).toHaveLength(1);
  });

  it("pay_debt is atomic and not an expense; recurring is idempotent", async () => {
    const client = createClient(url!, anonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: `domain-pay-${Date.now()}`,
      },
    });
    await client.auth.signInWithPassword({ email, password });
    const today = new Date().toISOString().slice(0, 10);

    const { data: debt } = await client
      .from("debts")
      .insert({
        user_id: userId,
        name: "Loan X",
        original_amount: 100,
        linked_account_id: null,
      })
      .select("id")
      .single();

    const { error: payError } = await client.rpc("pay_debt", {
      p_debt_id: debt!.id,
      p_account_id: bankId,
      p_amount: 40,
      p_paid_on: today,
      p_note: "partial",
    });
    expect(payError).toBeNull();

    const { data: debtRow } = await client
      .from("debts")
      .select("paid_amount, status")
      .eq("id", debt!.id)
      .single();
    expect(Number(debtRow!.paid_amount)).toBe(40);

    const { data: expenseCount } = await client
      .from("transactions")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("type", "expense")
      .eq("is_settlement", false);

    // Still only the card purchase expense
    expect(expenseCount).toHaveLength(1);

    const { error: overpay } = await client.rpc("pay_debt", {
      p_debt_id: debt!.id,
      p_account_id: bankId,
      p_amount: 100,
      p_paid_on: today,
    });
    expect(overpay).not.toBeNull();

    const { data: rule } = await client
      .from("recurring_transactions")
      .insert({
        user_id: userId,
        type: "income",
        amount: 10,
        account_id: bankId,
        category_id: incomeCat,
        frequency: "monthly",
        next_occurrence: today,
        description: "Bonus",
      })
      .select("id")
      .single();

    const { data: first } = await client.rpc(
      "generate_due_recurring_transactions",
      { p_as_of: today },
    );
    const { data: second } = await client.rpc(
      "generate_due_recurring_transactions",
      { p_as_of: today },
    );
    expect(Number(first)).toBeGreaterThanOrEqual(1);
    expect(Number(second)).toBe(0);

    const { data: gens } = await client
      .from("recurring_generations")
      .select("id")
      .eq("recurring_id", rule!.id);
    expect(gens).toHaveLength(1);
  });
});
