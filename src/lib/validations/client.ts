"use client";

import { useState, type FormEvent } from "react";
import type { ZodType } from "zod";
import { mapZodErrors, type ActionState } from "@/lib/utils/errors";

/**
 * Runs Zod validation on the client before the server action submits.
 * Server validation remains the source of truth.
 */
export function useClientSchemaValidation<T>(schema: ZodType<T>) {
  const [clientState, setClientState] = useState<ActionState>({});

  function validateBeforeSubmit(
    event: FormEvent<HTMLFormElement>,
    buildPayload: (formData: FormData) => unknown,
  ) {
    const formData = new FormData(event.currentTarget);
    const parsed = schema.safeParse(buildPayload(formData));
    if (!parsed.success) {
      event.preventDefault();
      setClientState(
        mapZodErrors(
          parsed.error as unknown as {
            flatten: () => { fieldErrors: Record<string, string[]> };
          },
        ),
      );
      return false;
    }
    setClientState({});
    return true;
  }

  function mergeState(serverState: ActionState): ActionState {
    return {
      error: serverState.error ?? clientState.error,
      success: serverState.success,
      fieldErrors: {
        ...clientState.fieldErrors,
        ...serverState.fieldErrors,
      },
    };
  }

  function clearClientState() {
    setClientState({});
  }

  return { clientState, validateBeforeSubmit, mergeState, clearClientState };
}
