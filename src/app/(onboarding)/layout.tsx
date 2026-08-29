import { getProfile, requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 text-text">
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  );
}
