import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Accede a tu espacio financiero privado.
        </p>
      </div>
      {params.message ? (
        <p className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {params.message}
        </p>
      ) : null}
      <LoginForm nextPath={params.next} />
    </div>
  );
}
