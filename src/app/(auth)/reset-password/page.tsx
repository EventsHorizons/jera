import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Define una contraseña segura para tu cuenta.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
