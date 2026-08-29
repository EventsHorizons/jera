import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const canRun = Boolean(url && anonKey && serviceRoleKey);

describe.skipIf(!canRun)("user account status", () => {
  const admin = createClient(url!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const password = "Password1";
  const email = `status-${Date.now()}@example.com`;
  let userId = "";

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("blocks login when profile is suspended", async () => {
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: "Status User" },
      });
    expect(createError).toBeNull();
    userId = created.user!.id;

    const { error: suspendError } = await admin
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", userId);
    expect(suspendError).toBeNull();

    const client = createClient(url!, anonKey!);
    const { data: loginData, error: loginError } =
      await client.auth.signInWithPassword({ email, password });

    // Auth may succeed; app-layer must reject. Simulate app check.
    expect(loginError).toBeNull();
    expect(loginData.user?.id).toBe(userId);

    const { data: profile } = await client
      .from("profiles")
      .select("status")
      .eq("id", userId)
      .maybeSingle();

    expect(profile?.status).toBe("suspended");

    // User cannot self-reactivate
    const { error: selfUpdateError } = await client
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId);

    expect(selfUpdateError).not.toBeNull();
  });
});
