import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { APP_NAME } from "@/lib/brand/constants";

export default function OnboardingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Bienvenido a {APP_NAME}</h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          Primero entiende tu dinero. Después decide qué hacer con él. Empecemos
          con lo esencial: cuánto tienes y dónde está.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
