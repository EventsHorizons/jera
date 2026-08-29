import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VerifyEmailClient } from "./verify-email-client";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email_confirmed_at) {
    redirect("/dashboard");
  }

  const email = user?.email ?? params.email ?? "";

  return (
    <VerifyEmailClient
      email={email}
      allowEmailEdit={!user?.email}
    />
  );
}
