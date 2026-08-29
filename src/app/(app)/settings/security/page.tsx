import { logoutAction, logoutAllDevicesAction } from "@/app/actions/auth";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/session";

export default async function SecuritySettingsPage() {
  const { user } = await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ajustes"
        description="Contraseña y sesiones activas."
      />
      <SettingsNav active="/settings/security" />

      <section className="space-y-4 border-b border-border pb-8">
        <h2 className="font-medium text-text">Cambiar contraseña</h2>
        <p className="text-sm text-text-muted">
          Al cambiarla se cerrarán todas las sesiones. Tendrás que iniciar sesión
          de nuevo.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-text">Sesiones</h2>
        <div className="space-y-4">
          <div className="rounded-xl bg-surface-muted/50 px-4 py-4">
            <p className="text-sm font-medium">Este dispositivo</p>
            <p className="mt-1 text-xs text-text-muted">Sesión de {user.email}</p>
            <form action={logoutAction} className="mt-3">
              <button
                type="submit"
                className="text-sm text-text-secondary underline hover:text-text"
              >
                Cerrar sesión aquí
              </button>
            </form>
          </div>
          <div className="rounded-xl bg-warning-soft/40 px-4 py-4">
            <p className="text-sm text-text-secondary">
              Cierra sesión en todos los dispositivos si sospechas acceso no
              autorizado.
            </p>
            <form action={logoutAllDevicesAction} className="mt-3">
              <button
                type="submit"
                className="text-sm font-medium text-warning underline"
              >
                Cerrar todas las sesiones
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
