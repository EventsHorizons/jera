import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = Boolean(url && anonKey && serviceRoleKey);

describe.skipIf(!canRun)("ownership integration", () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = "Password1";
  const timestamp = Date.now();
  const emailA = `user-a-${timestamp}@example.com`;
  const emailB = `user-b-${timestamp}@example.com`;
  let userAId = "";
  let userBId = "";
  let accountBId = "";
  let categoryBId = "";
  let txBId = "";
  let budgetBId = "";
  let goalBId = "";
  let debtBId = "";

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  it("creates two isolated users with profiles", async () => {
    const { data: createdA, error: errorA } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "User A" },
    });
    const { data: createdB, error: errorB } = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { display_name: "User B" },
    });

    expect(errorA).toBeNull();
    expect(errorB).toBeNull();
    userAId = createdA.user!.id;
    userBId = createdB.user!.id;

    const clientB = createClient(url!, anonKey!);
    const { error: loginError } = await clientB.auth.signInWithPassword({
      email: emailB,
      password,
    });
    expect(loginError).toBeNull();

    const { data: account, error: accountError } = await clientB
      .from("financial_accounts")
      .insert({
        user_id: userBId,
        name: "Cuenta B",
        type: "bank",
        nature: "asset",
        currency: "USD",
        initial_balance: 1000,
      })
      .select("id")
      .single();

    expect(accountError).toBeNull();
    accountBId = account!.id;

    const { data: category } = await clientB
      .from("categories")
      .select("id")
      .eq("user_id", userBId)
      .eq("kind", "expense")
      .limit(1)
      .single();

    categoryBId = category!.id;

    const { data: tx } = await clientB
      .from("transactions")
      .insert({
        user_id: userBId,
        type: "expense",
        amount: 10,
        account_id: accountBId,
        category_id: categoryBId,
        occurred_on: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    txBId = tx!.id;

    const now = new Date();
    const { data: budget } = await clientB
      .from("budgets")
      .insert({
        user_id: userBId,
        category_id: categoryBId,
        amount_limit: 100,
        period_month: now.getMonth() + 1,
        period_year: now.getFullYear(),
      })
      .select("id")
      .single();
    budgetBId = budget!.id;

    const { data: goal } = await clientB
      .from("saving_goals")
      .insert({
        user_id: userBId,
        name: "Meta B",
        target_amount: 500,
      })
      .select("id")
      .single();
    goalBId = goal!.id;

    const { data: debt } = await clientB
      .from("debts")
      .insert({
        user_id: userBId,
        name: "Deuda B",
        original_amount: 200,
      })
      .select("id")
      .single();
    debtBId = debt!.id;
  });

  it("denies cross-user access to all financial entities", async () => {
    const clientA = createClient(url!, anonKey!);
    const { error: loginError } = await clientA.auth.signInWithPassword({
      email: emailA,
      password,
    });
    expect(loginError).toBeNull();

    const { data: account } = await clientA
      .from("financial_accounts")
      .select("*")
      .eq("id", accountBId)
      .maybeSingle();
    expect(account).toBeNull();

    const { data: tx } = await clientA
      .from("transactions")
      .select("*")
      .eq("id", txBId)
      .maybeSingle();
    expect(tx).toBeNull();

    const { data: budget } = await clientA
      .from("budgets")
      .select("*")
      .eq("id", budgetBId)
      .maybeSingle();
    expect(budget).toBeNull();

    const { data: goal } = await clientA
      .from("saving_goals")
      .select("*")
      .eq("id", goalBId)
      .maybeSingle();
    expect(goal).toBeNull();

    const { data: debt } = await clientA
      .from("debts")
      .select("*")
      .eq("id", debtBId)
      .maybeSingle();
    expect(debt).toBeNull();

    const { data: forgedTx, error: forgeError } = await clientA
      .from("transactions")
      .insert({
        user_id: userBId,
        type: "expense",
        amount: 5,
        account_id: accountBId,
        category_id: categoryBId,
      })
      .select("id")
      .maybeSingle();

    expect(forgedTx).toBeNull();
    expect(forgeError).not.toBeNull();
  });
});
