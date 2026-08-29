"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { profileSchema } from "@/lib/validations/auth";
import { useClientSchemaValidation } from "@/lib/validations/client";

import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

export function ProfileForm({
  displayName,
  email,
  timezone,
}: {
  displayName: string;
  email: string;
  timezone: string;
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
      <Button type="submit" loading={pending}>
        Guardar cambios
      </Button>
    </form>
  );
}
