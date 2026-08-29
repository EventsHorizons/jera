import { EditTransactionForm } from "@/components/finance/edit-transaction-form";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!transaction) notFound();

  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, name, currency")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("name");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("user_id", user.id)
    .order("name");

  const typeLabel =
    transaction.type === "income"
      ? "ingreso"
      : transaction.type === "expense"
        ? "gasto"
        : transaction.type === "transfer"
          ? "transferencia"
          : "ajuste";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="fc-page-title">Editar {typeLabel}</h1>
        <p className="fc-page-subtitle">
          Los saldos y presupuestos se recalculan automáticamente.
        </p>
      </div>
      <EditTransactionForm
        transaction={transaction}
        accounts={accounts ?? []}
        categories={categories ?? []}
      />
    </div>
  );
}
