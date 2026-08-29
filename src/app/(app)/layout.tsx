import { AppShell } from "@/components/layout/app-shell";
import { getProfile, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);

  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const supabase = await createClient();

  const { data: accountRows } = await supabase
    .from("financial_accounts")
    .select("id, name, currency")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("name");

  const { data: categoryRows } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("kind", "expense")
    .order("name");

  const accounts = (accountRows ?? []).map((a) => ({
    value: a.id,
    label: `${a.name} (${a.currency})`,
    currency: a.currency,
  }));

  const categories = (categoryRows ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <AppShell
      displayName={profile?.display_name ?? user.email ?? "Usuario"}
      accounts={accounts}
      categories={categories}
      baseCurrency={profile?.base_currency ?? "USD"}
    >
      {children}
    </AppShell>
  );
}
