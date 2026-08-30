"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BASE_CURRENCIES } from "@/lib/finance/currencies";
import { profileSchema } from "@/lib/validations/auth";
import { useClientSchemaValidation } from "@/lib/validations/client";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function ProfileForm({
  displayName,
  email,
  timezone,
  baseCurrency,
}: {
  displayName: string;
  email: string;
  timezone: string;
  baseCurrency: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );
  const { validateBeforeSubmit, mergeState } =
    useClientSchemaValidation(profileSchema);
  const view = mergeState(state);

  return (
    <form
      action={formAction}
      onSubmit={(event) =>
        validateBeforeSubmit(event, (formData) => ({
          displayName: formData.get("displayName"),
          timezone: formData.get("timezone"),
          baseCurrency: formData.get("baseCurrency"),
        }))
      }
      className="max-w-lg space-y-4"
      noValidate
    >
      {view.error ? <Alert variant="error">{view.error}</Alert> : null}
      {view.success ? <Alert variant="success">{view.success}</Alert> : null}
      <Input
        name="displayName"
        label="Nombre"
        defaultValue={displayName}
        required
        error={view.fieldErrors?.displayName?.[0]}
      />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-text-secondary">Correo electrónico</span>
        <input
          value={email}
          disabled
          readOnly
          className="h-10 rounded-lg border border-border bg-[#0d0e10] px-3 text-text-muted"
          aria-describedby="email-readonly-hint"
        />
        <span id="email-readonly-hint" className="text-xs text-text-muted">
          El correo se gestiona desde la verificación de cuenta y no se puede
          editar aquí.
        </span>
      </label>
      <Input
        name="timezone"
        label="Zona horaria"
        defaultValue={timezone}
        required
        error={view.fieldErrors?.timezone?.[0]}
      />
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium leading-none text-text-secondary">
          Moneda base
        </span>
        <select
          name="baseCurrency"
          defaultValue={baseCurrency}
          className="h-11 min-h-11 rounded-xl border border-border/80 bg-surface px-4 text-text outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        >
          {BASE_CURRENCIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-text-muted">
          Usamos esta moneda para totales y conversiones en el resumen.
        </span>
        {view.fieldErrors?.baseCurrency?.[0] ? (
          <span className="text-xs text-danger">
            {view.fieldErrors.baseCurrency[0]}
          </span>
        ) : null}
      </label>
      <Button type="submit" loading={pending}>
        Guardar cambios
      </Button>
    </form>
  );
}
