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

  // Email verification is not part of the product flow anymore.
  if (user) {
    redirect("/dashboard");
  }

  return <VerifyEmailClient email={params.email ?? ""} />;
}
