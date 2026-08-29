import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default function OnboardingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Bienvenido a FinControl</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Tu espacio privado para saber cuánto dinero tienes, dónde está y qué
          compromisos financieros tienes.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
