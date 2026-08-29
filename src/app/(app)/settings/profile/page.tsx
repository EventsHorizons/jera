import { getProfile, requireUser } from "@/lib/auth/session";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui/page-header";

export default async function ProfileSettingsPage() {
  const { user } = await requireUser();
  const profile = await getProfile(user.id);

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
      />
    </div>
  );
}
