import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceRoleKey);

function authedClient(email: string, storageKey: string): SupabaseClient {
  return createClient(url!, anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey,
    },
  });
}

describe.skipIf(!canRun)("database integrity", () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = "Password1";
  const ts = Date.now();
  const emailA = `db-a-${ts}@example.com`;
  const emailB = `db-b-${ts}@example.com`;
  let userA = "";
  let userB = "";
  let accountA = "";
  let accountB = "";
  let categoryA = "";
  let categoryB = "";

  afterAll(async () => {
    if (userA) await admin.auth.admin.deleteUser(userA);
    if (userB) await admin.auth.admin.deleteUser(userB);
  });

  it("rejects cross-user FK relationships and invalid money nulls", async () => {
    const createdA = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { display_name: "DB A" },
    });
    const createdB = await admin.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { display_name: "DB B" },
    });
    expect(createdA.error).toBeNull();
    expect(createdB.error).toBeNull();
    userA = createdA.data.user!.id;
    userB = createdB.data.user!.id;

    const clientA = authedClient(emailA, `db-a-${ts}`);
    const clientB = authedClient(emailB, `db-b-${ts}`);
    const loginA = await clientA.auth.signInWithPassword({
      email: emailA,
      password,
    });
    const loginB = await clientB.auth.signInWithPassword({
      email: emailB,
      password,
    });
    expect(loginA.error).toBeNull();
    expect(loginB.error).toBeNull();

    const { data: accA, error: errA } = await clientA
      .from("financial_accounts")
      .insert({
        user_id: userA,
        name: "A Bank",
        type: "bank",
        nature: "asset",
        currency: "USD",
        initial_balance: 100,
      })
      .select("id")
      .single();
    expect(errA).toBeNull();
    accountA = accA!.id;

    const { data: accB, error: errB } = await clientB
      .from("financial_accounts")
      .insert({
        user_id: userB,
        name: "B Bank",
        type: "bank",
        nature: "asset",
        currency: "USD",
        initial_balance: 100,
      })
      .select("id")
      .single();
    expect(errB).toBeNull();
    accountB = accB!.id;

    const { data: catA } = await clientA
      .from("categories")
      .select("id")
      .eq("user_id", userA)
      .eq("kind", "expense")
      .limit(1)
      .single();
    categoryA = catA!.id;

    const { data: catB } = await clientB
      .from("categories")
      .select("id")
      .eq("user_id", userB)
      .eq("kind", "expense")
      .limit(1)
      .single();
    categoryB = catB!.id;

    const { error: crossAccount } = await clientA.from("transactions").insert({
      user_id: userA,
      type: "expense",
      amount: 10,
      account_id: accountB,
      category_id: categoryA,
      occurred_on: new Date().toISOString().slice(0, 10),
    });
    expect(crossAccount).not.toBeNull();

    const { error: crossCategory } = await clientA.from("transactions").insert({
      user_id: userA,
      type: "expense",
      amount: 10,
      account_id: accountA,
      category_id: categoryB,
      occurred_on: new Date().toISOString().slice(0, 10),
    });
    expect(crossCategory).not.toBeNull();

    const { error: badCurrency } = await clientA
      .from("financial_accounts")
      .insert({
        user_id: userA,
        name: "Bad FX",
        type: "cash",
        nature: "asset",
        currency: "us",
        initial_balance: 0,
      });
    expect(badCurrency).not.toBeNull();

    const { error: badNature } = await clientA
      .from("financial_accounts")
      .insert({
        user_id: userA,
        name: "Bad Nature",
        type: "credit_card",
        nature: "asset",
        currency: "USD",
        initial_balance: 0,
      });
    expect(badNature).not.toBeNull();

    const { data: mxn } = await clientA
      .from("financial_accounts")
      .insert({
        user_id: userA,
        name: "MXN Cash",
        type: "cash",
        nature: "asset",
        currency: "MXN",
        initial_balance: 50,
      })
      .select("id")
      .single();

    const { error: fxMismatch } = await clientA.from("transactions").insert({
      user_id: userA,
      type: "transfer",
      amount: 10,
      account_id: accountA,
      counterparty_account_id: mxn!.id,
      transfer_group_id: crypto.randomUUID(),
      occurred_on: new Date().toISOString().slice(0, 10),
    });
    expect(fxMismatch).not.toBeNull();

    const now = new Date();
    const { error: crossBudget } = await clientA.from("budgets").insert({
      user_id: userA,
      category_id: categoryB,
      amount_limit: 50,
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
    });
    expect(crossBudget).not.toBeNull();

    const { data: goal } = await clientA
      .from("saving_goals")
      .insert({
        user_id: userA,
        name: "Trip",
        target_amount: 100,
      })
      .select("id, current_amount")
      .single();

    await clientA.from("goal_contributions").insert({
      user_id: userA,
      goal_id: goal!.id,
      amount: 40,
      contributed_on: new Date().toISOString().slice(0, 10),
    });

    const { data: synced } = await clientA
      .from("saving_goals")
      .select("current_amount, status")
      .eq("id", goal!.id)
      .single();
    expect(Number(synced!.current_amount)).toBe(40);

    const { error: crossGoal } = await clientB.from("goal_contributions").insert({
      user_id: userB,
      goal_id: goal!.id,
      amount: 5,
      contributed_on: new Date().toISOString().slice(0, 10),
    });
    expect(crossGoal).not.toBeNull();

    await clientA.from("budgets").insert({
      user_id: userA,
      category_id: categoryA,
      amount_limit: 50,
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
    });
    const { error: dupBudget } = await clientA.from("budgets").insert({
      user_id: userA,
      category_id: categoryA,
      amount_limit: 80,
      period_month: now.getMonth() + 1,
      period_year: now.getFullYear(),
    });
    expect(dupBudget).not.toBeNull();
  });
});
