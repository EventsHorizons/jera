import { getProfile, requireUser } from "@/lib/auth/session";
import { EngagementSettingsForm } from "@/components/settings/engagement-settings-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function ProfileSettingsPage() {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);
  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ajustes"
        description="Tu perfil y preferencias de la cuenta."
      />
      <SettingsNav active="/settings/profile" />
      <ProfileForm
        displayName={profile?.display_name ?? ""}
        email={user.email ?? ""}
        timezone={profile?.timezone ?? "UTC"}
        baseCurrency={profile?.base_currency ?? "USD"}
      />
      <EngagementSettingsForm
        cohortOptIn={profile?.cohort_opt_in ?? false}
        prefs={{
          streak_alerts: prefs?.streak_alerts ?? true,
          budget_alerts: prefs?.budget_alerts ?? true,
          insight_alerts: prefs?.insight_alerts ?? true,
          cohort_alerts: prefs?.cohort_alerts ?? false,
          quiet_hours: prefs?.quiet_hours ?? true,
        }}
      />
    </div>
  );
}
