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
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/ui/page-header";
import { RowActions } from "@/components/ui/row-actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { todayISODate } from "@/lib/finance/calculations";
import type { ActionState } from "@/lib/utils/errors";
import { Pause, Play, Plus, RefreshCw, X } from "lucide-react";

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
        description="Pagos e ingresos que se repiten."
        action={
          <div className="flex items-center gap-1">
            <form action={genAction}>
              <IconButton
                type="submit"
                label="Generar pendientes"
                variant="secondary"
                disabled={generating}
              >
                <RefreshCw
                  className={`h-4 w-4 ${generating ? "animate-spin" : ""}`}
                  strokeWidth={1.75}
                />
              </IconButton>
            </form>
            <Button
              type="button"
              size="icon"
              icon={<Plus className="h-4 w-4" strokeWidth={2} />}
              aria-label="Nueva recurrente"
              onClick={() => setCreateOpen(true)}
            />
          </div>
        }
      />

      {genState.success ? <Alert variant="success">{genState.success}</Alert> : null}
      {genState.error ? <Alert variant="error">{genState.error}</Alert> : null}

      {rules.length === 0 ? (
        <EmptyPanel
          title="Sin recurrentes"
          description="Registra salario, alquiler o suscripciones."
          actionLabel="Crear"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border/80 bg-surface">
          {rules.map((rule) => (
            <li key={rule.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {rule.description || rule.type}
                  </p>
                  <p className="fc-amount mt-1 text-lg font-semibold">
                    {Number(rule.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-text-muted">
                    {FREQ[rule.frequency] ?? rule.frequency} · {rule.next_occurrence}
                  </p>
                </div>
                <RowActions>
                  {rule.status === "active" ? (
                    <form action={pauseRecurringAction} className="inline-flex">
                      <input type="hidden" name="id" value={rule.id} />
                      <IconButton type="submit" label="Pausar" variant="ghost">
                        <Pause className="h-4 w-4" strokeWidth={1.75} />
                      </IconButton>
                    </form>
                  ) : null}
                  {rule.status === "paused" ? (
                    <form action={resumeRecurringAction} className="inline-flex">
                      <input type="hidden" name="id" value={rule.id} />
                      <IconButton type="submit" label="Reanudar" variant="ghost">
                        <Play className="h-4 w-4" strokeWidth={1.75} />
                      </IconButton>
                    </form>
                  ) : null}
                  {rule.status !== "cancelled" ? (
                    <form action={cancelRecurringAction} className="inline-flex">
                      <input type="hidden" name="id" value={rule.id} />
                      <IconButton type="submit" label="Cancelar" variant="danger">
                        <X className="h-4 w-4" strokeWidth={1.75} />
                      </IconButton>
                    </form>
                  ) : null}
                </RowActions>
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
          <Input name="description" label="Nombre" placeholder="Netflix, alquiler…" />
          <Button type="submit" loading={creating} className="w-full">
            Guardar
          </Button>
        </form>
      </Drawer>
    </div>
  );
}
