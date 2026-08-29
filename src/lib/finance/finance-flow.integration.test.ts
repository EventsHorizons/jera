import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceRoleKey);

describe.skipIf(!canRun)("finance flow integration", () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = "Password1";
  const email = `finance-flow-${Date.now()}@example.com`;
  let userId = "";
  let bankId = "";
  let cashId = "";
  let expenseCategoryId = "";
  let incomeCategoryId = "";

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("creates account, income, expense, transfer with consistent balances", async () => {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: "Flow User" },
      });
    expect(createError).toBeNull();
    userId = created.user!.id;

    const client = createClient(url!, anonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: `finance-flow-${Date.now()}`,
      },
    });
    const { error: loginError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    expect(loginError).toBeNull();

    const { data: bank, error: bankError } = await client
      .from("financial_accounts")
      .insert({
        user_id: userId,
        name: "Banco",
        type: "bank",
        nature: "asset",
        currency: "USD",
        initial_balance: 1000,
      })
      .select("id")
      .single();
    expect(bankError).toBeNull();
    bankId = bank!.id;

    const { data: cash, error: cashError } = await client
      .from("financial_accounts")
      .insert({
        user_id: userId,
        name: "Efectivo",
        type: "cash",
        nature: "asset",
        currency: "USD",
        initial_balance: 0,
      })
      .select("id")
      .single();
    expect(cashError).toBeNull();
    cashId = cash!.id;

    const { data: incomeCat } = await client
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "income")
      .limit(1)
      .single();
    const { data: expenseCat } = await client
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "expense")
      .limit(1)
      .single();
    incomeCategoryId = incomeCat!.id;
    expenseCategoryId = expenseCat!.id;

    const today = new Date().toISOString().slice(0, 10);

    const { error: incomeError } = await client.from("transactions").insert({
      user_id: userId,
      type: "income",
      amount: 200,
      account_id: bankId,
      category_id: incomeCategoryId,
      occurred_on: today,
      description: "Salario",
    });
    expect(incomeError).toBeNull();

    const { error: expenseError } = await client.from("transactions").insert({
      user_id: userId,
      type: "expense",
      amount: 50,
      account_id: bankId,
      category_id: expenseCategoryId,
      occurred_on: today,
      description: "Comida",
    });
    expect(expenseError).toBeNull();

    const { error: transferError } = await client.from("transactions").insert({
      user_id: userId,
      type: "transfer",
      amount: 100,
      account_id: bankId,
      counterparty_account_id: cashId,
      occurred_on: today,
      description: "Retiro",
      transfer_group_id: crypto.randomUUID(),
    });
    expect(transferError).toBeNull();

    const { data: bankBalance, error: bankBalError } = await client.rpc(
      "get_account_balance",
      { p_account_id: bankId },
    );
    const { data: cashBalance, error: cashBalError } = await client.rpc(
      "get_account_balance",
      { p_account_id: cashId },
    );

    expect(bankBalError).toBeNull();
    expect(cashBalError).toBeNull();
    expect(Number(bankBalance)).toBe(1050);
    expect(Number(cashBalance)).toBe(100);

    const { data: txs } = await client
      .from("transactions")
      .select("id, type")
      .eq("user_id", userId)
      .eq("type", "expense");
    const expenseId = txs![0]!.id;

    const { error: deleteError } = await client
      .from("transactions")
      .delete()
      .eq("id", expenseId)
      .eq("user_id", userId);
    expect(deleteError).toBeNull();

    const { data: bankAfterDelete } = await client.rpc("get_account_balance", {
      p_account_id: bankId,
    });
    expect(Number(bankAfterDelete)).toBe(1100);
  });
});
