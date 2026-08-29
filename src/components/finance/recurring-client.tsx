"use client";

import { useActionState, useState } from "react";
import {
  cancelRecurringAction,
  createRecurringAction,
  generateRecurringAction,
  pauseRecurringAction,
  resumeRecurringAction,
} from "@/app/actions/finance";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { todayISODate } from "@/lib/finance/calculations";
import type { ActionState } from "@/lib/utils/errors";

const initialState: ActionState = {};

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; kind: string };
type Recurring = {
  id: string;
  type: string;
  amount: number;
  frequency: string;
  next_occurrence: string;
  status: string;
  description: string | null;
};

const FREQ: Record<string, string> = {
  daily: "Diaria",
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

export function RecurringClient({
  accounts,
  categories,
  rules,
}: {
  accounts: Account[];
  categories: Category[];
  rules: Recurring[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense" | "transfer">("expense");
  const [createState, createAction, creating] = useActionState(
    createRecurringAction,
    initialState,
  );
  const [genState, genAction, generating] = useActionState(
    async () => generateRecurringAction(),
    initialState,
  );

  const accountOptions = accounts.map((a) => ({
    value: a.id,
    label: `${a.name} (${a.currency})`,
  }));
  const cats = categories.filter((c) => c.kind === type);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recurrentes"
        description="Salarios, alquiler, suscripciones y otros pagos que se repiten."
        action={
          <div className="flex gap-2">
            <form action={genAction}>
              <Button type="submit" variant="secondary" loading={generating}>
                Generar pendientes
              </Button>
            </form>
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Nueva
            </Button>
          </div>
        }
      />

      {genState.success ? <Alert variant="success">{genState.success}</Alert> : null}
      {genState.error ? <Alert variant="error">{genState.error}</Alert> : null}

      {rules.length === 0 ? (
        <EmptyPanel
          title="Sin operaciones recurrentes"
          description="Registra tu salario, alquiler o suscripciones para saber qué viene pronto."
          actionLabel="Crear recurrente"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <ul className="divide-y divide-border">
          {rules.map((rule) => (
            <li key={rule.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {rule.description || rule.type}
                  </p>
                  <p className="fc-amount mt-1 text-lg font-semibold">
                    {Number(rule.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-text-muted">
                    {FREQ[rule.frequency] ?? rule.frequency} · Próxima{" "}
                    {rule.next_occurrence}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  {rule.status === "active" ? (
                    <form action={pauseRecurringAction}>
                      <input type="hidden" name="id" value={rule.id} />
                      <button type="submit" className="text-text-secondary hover:text-text">
                        Pausar
                      </button>
                    </form>
                  ) : null}
                  {rule.status === "paused" ? (
                    <form action={resumeRecurringAction}>
                      <input type="hidden" name="id" value={rule.id} />
                      <button type="submit" className="fc-link">
                        Reanudar
                      </button>
                    </form>
                  ) : null}
                  {rule.status !== "cancelled" ? (
                    <form action={cancelRecurringAction}>
                      <input type="hidden" name="id" value={rule.id} />
                      <button type="submit" className="text-text-muted hover:text-danger">
                        Cancelar
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva recurrencia">
        {createState.error ? <Alert variant="error">{createState.error}</Alert> : null}
        {createState.success ? <Alert variant="success">{createState.success}</Alert> : null}
        <form action={createAction} className="space-y-3">
          <Select
            name="type"
            label="Tipo"
            value={type}
            onChange={(e) =>
              setType(e.target.value as "income" | "expense" | "transfer")
            }
            options={[
              { value: "expense", label: "Gasto" },
              { value: "income", label: "Ingreso" },
              { value: "transfer", label: "Transferencia" },
            ]}
          />
          <Input name="amount" label="Monto" type="number" step="0.01" min="0.01" required />
          <Select
            name="accountId"
            label={type === "transfer" ? "Desde" : "Cuenta"}
            options={accountOptions}
            required
          />
          {type === "transfer" ? (
            <Select
              name="counterpartyAccountId"
              label="Hacia"
              options={accountOptions}
              required
            />
          ) : (
            <Select
              name="categoryId"
              label="Categoría"
              options={cats.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
          )}
          <Select
            name="frequency"
            label="Frecuencia"
            options={[
              { value: "monthly", label: "Mensual" },
              { value: "weekly", label: "Semanal" },
              { value: "daily", label: "Diaria" },
              { value: "yearly", label: "Anual" },
            ]}
            required
          />
          <Input
            name="nextOccurrence"
            label="Próxima fecha"
            type="date"
            defaultValue={todayISODate()}
            required
          />
          <Input name="description" label="Nombre (opcional)" placeholder="Ej. Netflix, alquiler…" />
          <Button type="submit" loading={creating} className="w-full">
            Guardar
          </Button>
        </form>
      </Drawer>
    </div>
  );
}
