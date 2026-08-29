import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Te ayudaremos a recuperar el acceso a tu cuenta.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
