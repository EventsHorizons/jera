import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui/page-header";

export default function AccountSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Ajustes"
        description="Eliminar tu cuenta y todos tus datos."
      />
      <SettingsNav active="/settings/account" />
      <DeleteAccountForm />
    </div>
  );
}
