import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Un lugar único para controlar tu dinero personal.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
