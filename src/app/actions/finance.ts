"use server";

import { requireUser } from "@/lib/auth/session";
import {
  natureForType,
  todayISODate,
} from "@/lib/finance/calculations";
import { mapZodErrors, type ActionState } from "@/lib/utils/errors";
import {
  accountSchema,
  adjustmentSchema,
  budgetSchema,
  categorySchema,
  debtPaymentSchema,
  debtSchema,
  goalContributionSchema,
  goalSchema,
  incomeExpenseSchema,
  recurringSchema,
  transferSchema,
} from "@/lib/validations/finance";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateFinance() {
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/goals");
  revalidatePath("/debts");
  revalidatePath("/recurring");
}

export async function createAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    institution: formData.get("institution") ?? "",
    currency: formData.get("currency"),
    initialBalance: formData.get("initialBalance"),
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("financial_accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    nature: natureForType(parsed.data.type),
    institution: parsed.data.institution || null,
    currency: parsed.data.currency.toUpperCase(),
    initial_balance: parsed.data.initialBalance,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya tienes una cuenta con ese nombre." };
    return { error: "No se pudo crear la cuenta." };
  }

  revalidateFinance();
  return { success: "Cuenta creada." };
}

export async function updateAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    institution: formData.get("institution") ?? "",
    currency: formData.get("currency"),
    initialBalance: formData.get("initialBalance"),
  });

  if (!id || !parsed.success) {
    return parsed.success ? { error: "Cuenta inválida." } : mapZodErrors(parsed.error);
  }

  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("financial_accounts")
    .select("id, initial_balance")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return { error: "Cuenta no encontrada." };

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or(`account_id.eq.${id},counterparty_account_id.eq.${id}`);

  const hasTx = (count ?? 0) > 0;

  const { error } = await supabase
    .from("financial_accounts")
    .update({
      name: parsed.data.name,
      institution: parsed.data.institution || null,
      ...(hasTx
        ? {}
        : {
            type: parsed.data.type,
            nature: natureForType(parsed.data.type),
            currency: parsed.data.currency.toUpperCase(),
            initial_balance: parsed.data.initialBalance,
          }),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "Ya tienes una cuenta con ese nombre." };
    return { error: "No se pudo actualizar la cuenta." };
  }

  revalidateFinance();
  return { success: "Cuenta actualizada." };
}

export async function archiveAccountAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();

  await supabase
    .from("financial_accounts")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidateFinance();
}

export async function restoreAccountAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();

  await supabase
    .from("financial_accounts")
    .update({ status: "active" })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidateFinance();
}

export async function deleteFinancialAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();

  const { data: account } = await supabase
    .from("financial_accounts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) return { error: "Cuenta no encontrada." };

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .or(`account_id.eq.${id},counterparty_account_id.eq.${id}`);

  if ((count ?? 0) > 0) {
    return {
      error: "No se puede eliminar: tiene movimientos. Archívala en su lugar.",
    };
  }

  const { error } = await supabase
    .from("financial_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar la cuenta." };

  revalidateFinance();
  return { success: "Cuenta eliminada." };
}

export async function createIncomeExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = incomeExpenseSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description") ?? "",
    note: formData.get("note") ?? "",
    reimbursesTransactionId: formData.get("reimbursesTransactionId") ?? "",
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: account } = await supabase
    .from("financial_accounts")
    .select("id, status, nature")
    .eq("id", parsed.data.accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account || account.status !== "active") {
    return { error: "Cuenta no válida." };
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id, kind")
    .eq("id", parsed.data.categoryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!category || category.kind !== parsed.data.type) {
    return { error: "Categoría no válida para este tipo de movimiento." };
  }

  let reimbursesId: string | null = null;
  if (parsed.data.type === "income" && parsed.data.reimbursesTransactionId) {
    const { data: original } = await supabase
      .from("transactions")
      .select("id, type, amount")
      .eq("id", parsed.data.reimbursesTransactionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!original || original.type !== "expense") {
      return { error: "El reembolso debe vincularse a un gasto propio." };
    }
    reimbursesId = original.id;
  }

  if (parsed.data.type === "expense" && account.nature === "asset") {
    const { data: balance } = await supabase.rpc("get_account_balance", {
      p_account_id: account.id,
    });
    if (Number(balance) < parsed.data.amount) {
      return { error: "Saldo insuficiente en la cuenta." };
    }
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurredOn,
    account_id: parsed.data.accountId,
    category_id: parsed.data.categoryId,
    description: parsed.data.description || null,
    note: parsed.data.note || null,
    reimburses_transaction_id: reimbursesId,
  });

  if (error) return { error: "No se pudo registrar el movimiento." };

  revalidateFinance();

  if (formData.get("_quick") === "1") {
    return { success: "Movimiento registrado." };
  }

  redirect("/transactions");
}

export async function createTransferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transferSchema.safeParse({
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    description: formData.get("description") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, status, currency, nature, type")
    .eq("user_id", user.id)
    .in("id", [parsed.data.fromAccountId, parsed.data.toAccountId]);

  const from = accounts?.find((a) => a.id === parsed.data.fromAccountId);
  const to = accounts?.find((a) => a.id === parsed.data.toAccountId);

  if (!from || !to || from.status !== "active" || to.status !== "active") {
    return { error: "Cuentas no válidas." };
  }

  if (from.currency !== to.currency) {
    return { error: "Las cuentas deben usar la misma moneda." };
  }

  if (from.nature === "asset") {
    const { data: balance } = await supabase.rpc("get_account_balance", {
      p_account_id: from.id,
    });
    if (Number(balance) < parsed.data.amount) {
      return { error: "Saldo insuficiente en la cuenta origen." };
    }
  }

  // Paying a credit card / loan: asset → liability is a settlement, not a new expense.
  const isSettlement = from.nature === "asset" && to.nature === "liability";
  const transferGroupId = crypto.randomUUID();

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "transfer",
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurredOn,
    account_id: parsed.data.fromAccountId,
    counterparty_account_id: parsed.data.toAccountId,
    transfer_group_id: transferGroupId,
    description:
      parsed.data.description ||
      (isSettlement ? "Pago de tarjeta/préstamo" : null),
    note: parsed.data.note || null,
    is_settlement: isSettlement,
  });

  if (error) return { error: "No se pudo registrar la transferencia." };

  revalidateFinance();
  redirect("/transactions");
}

export async function createAdjustmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = adjustmentSchema.safeParse({
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    accountId: formData.get("accountId"),
    direction: formData.get("direction"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: account } = await supabase
    .from("financial_accounts")
    .select("id, status")
    .eq("id", parsed.data.accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account || account.status !== "active") {
    return { error: "Cuenta no válida." };
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "adjustment",
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurredOn,
    account_id: parsed.data.accountId,
    adjustment_direction: parsed.data.direction,
    adjustment_reason: parsed.data.reason,
    description: `Ajuste: ${parsed.data.reason}`,
  });

  if (error) return { error: "No se pudo registrar el ajuste." };

  revalidateFinance();
  redirect("/transactions");
}

export async function deleteTransactionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();

  await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidateFinance();
}

export async function updateIncomeExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = incomeExpenseSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!id) return { error: "Movimiento inválido." };
  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("transactions")
    .select("id, type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing || (existing.type !== "income" && existing.type !== "expense")) {
    return { error: "Solo puedes editar ingresos o gastos con este formulario." };
  }

  if (existing.type !== parsed.data.type) {
    return { error: "No se puede cambiar el tipo del movimiento." };
  }

  const { data: account } = await supabase
    .from("financial_accounts")
    .select("id, status, nature")
    .eq("id", parsed.data.accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account || account.status !== "active") {
    return { error: "Cuenta no válida." };
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id, kind")
    .eq("id", parsed.data.categoryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!category || category.kind !== parsed.data.type) {
    return { error: "Categoría no válida." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: parsed.data.amount,
      occurred_on: parsed.data.occurredOn,
      account_id: parsed.data.accountId,
      category_id: parsed.data.categoryId,
      description: parsed.data.description || null,
      note: parsed.data.note || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo actualizar el movimiento." };

  revalidateFinance();
  redirect("/transactions");
}

export async function updateTransferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = transferSchema.safeParse({
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    description: formData.get("description") ?? "",
    note: formData.get("note") ?? "",
  });

  if (!id) return { error: "Movimiento inválido." };
  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("transactions")
    .select("id, type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing || existing.type !== "transfer") {
    return { error: "Transferencia no encontrada." };
  }

  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, status, currency")
    .eq("user_id", user.id)
    .in("id", [parsed.data.fromAccountId, parsed.data.toAccountId]);

  const from = accounts?.find((a) => a.id === parsed.data.fromAccountId);
  const to = accounts?.find((a) => a.id === parsed.data.toAccountId);

  if (!from || !to || from.status !== "active" || to.status !== "active") {
    return { error: "Cuentas no válidas." };
  }

  if (from.currency !== to.currency) {
    return { error: "Las cuentas deben usar la misma moneda." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: parsed.data.amount,
      occurred_on: parsed.data.occurredOn,
      account_id: parsed.data.fromAccountId,
      counterparty_account_id: parsed.data.toAccountId,
      description: parsed.data.description || null,
      note: parsed.data.note || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo actualizar la transferencia." };

  revalidateFinance();
  redirect("/transactions");
}

export async function updateAdjustmentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = adjustmentSchema.safeParse({
    amount: formData.get("amount"),
    occurredOn: formData.get("occurredOn"),
    accountId: formData.get("accountId"),
    direction: formData.get("direction"),
    reason: formData.get("reason"),
  });

  if (!id) return { error: "Movimiento inválido." };
  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("transactions")
    .select("id, type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing || existing.type !== "adjustment") {
    return { error: "Ajuste no encontrado." };
  }

  const { data: account } = await supabase
    .from("financial_accounts")
    .select("id, status")
    .eq("id", parsed.data.accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account || account.status !== "active") {
    return { error: "Cuenta no válida." };
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: parsed.data.amount,
      occurred_on: parsed.data.occurredOn,
      account_id: parsed.data.accountId,
      adjustment_direction: parsed.data.direction,
      adjustment_reason: parsed.data.reason,
      description: `Ajuste: ${parsed.data.reason}`,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo actualizar el ajuste." };

  revalidateFinance();
  redirect("/transactions");
}

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    parentId: formData.get("parentId") ?? "",
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  if (parsed.data.parentId) {
    const { data: parent } = await supabase
      .from("categories")
      .select("id, kind")
      .eq("id", parsed.data.parentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!parent || parent.kind !== parsed.data.kind) {
      return { error: "Categoría padre inválida." };
    }
  }

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    parent_id: parsed.data.parentId || null,
    is_system: false,
  });

  if (error) {
    if (error.code === "23505") return { error: "Esa categoría ya existe." };
    return { error: "No se pudo crear la categoría." };
  }

  revalidatePath("/transactions");
  revalidatePath("/budgets");
  return { success: "Categoría creada." };
}

export async function deleteCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();

  const { data: category } = await supabase
    .from("categories")
    .select("id, is_system, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!category) return { error: "Categoría no encontrada." };
  if (category.is_system) {
    return { error: "No puedes eliminar categorías del sistema." };
  }

  const { count: txCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("category_id", id);

  if ((txCount ?? 0) > 0) {
    return {
      error: "La categoría tiene movimientos. Reasigna o déjala sin eliminar.",
    };
  }

  const { count: budgetCount } = await supabase
    .from("budgets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("category_id", id);

  if ((budgetCount ?? 0) > 0) {
    return { error: "La categoría tiene presupuestos asociados." };
  }

  const { count: childCount } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("parent_id", id);

  if ((childCount ?? 0) > 0) {
    return { error: "Elimina primero las subcategorías." };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo eliminar la categoría." };

  revalidatePath("/transactions");
  revalidatePath("/budgets");
  return { success: "Categoría eliminada." };
}

export async function updateCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id || name.length < 1 || name.length > 50) {
    return { error: "Nombre inválido." };
  }

  const { supabase, user } = await requireUser();

  const { data: category } = await supabase
    .from("categories")
    .select("id, is_system, kind")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!category) return { error: "Categoría no encontrada." };

  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "Esa categoría ya existe." };
    return { error: "No se pudo actualizar." };
  }

  revalidatePath("/transactions");
  revalidatePath("/budgets");
  return { success: "Categoría actualizada." };
}

export async function createBudgetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amountLimit: formData.get("amountLimit"),
    periodMonth: formData.get("periodMonth"),
    periodYear: formData.get("periodYear"),
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: category } = await supabase
    .from("categories")
    .select("id, kind")
    .eq("id", parsed.data.categoryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!category || category.kind !== "expense") {
    return { error: "Solo puedes presupuestar categorías de gasto." };
  }

  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: parsed.data.categoryId,
    amount_limit: parsed.data.amountLimit,
    period_month: parsed.data.periodMonth,
    period_year: parsed.data.periodYear,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un presupuesto para esa categoría y período." };
    }
    return { error: "No se pudo crear el presupuesto." };
  }

  revalidateFinance();
  return { success: "Presupuesto creado." };
}

export async function deleteBudgetAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  revalidateFinance();
}

export async function updateBudgetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amountLimit: formData.get("amountLimit"),
    periodMonth: formData.get("periodMonth"),
    periodYear: formData.get("periodYear"),
  });

  if (!id) return { error: "Presupuesto inválido." };
  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("budgets")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return { error: "Presupuesto no encontrado." };

  const { error } = await supabase
    .from("budgets")
    .update({
      category_id: parsed.data.categoryId,
      amount_limit: parsed.data.amountLimit,
      period_month: parsed.data.periodMonth,
      period_year: parsed.data.periodYear,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un presupuesto para esa categoría y período." };
    }
    return { error: "No se pudo actualizar el presupuesto." };
  }

  revalidateFinance();
  return { success: "Presupuesto actualizado." };
}

export async function createGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = goalSchema.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: formData.get("targetDate") ?? "",
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("saving_goals").insert({
    user_id: user.id,
    name: parsed.data.name,
    target_amount: parsed.data.targetAmount,
    target_date: parsed.data.targetDate || null,
  });

  if (error) return { error: "No se pudo crear la meta." };

  revalidateFinance();
  return { success: "Meta creada." };
}

export async function contributeGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = goalContributionSchema.safeParse({
    goalId: formData.get("goalId"),
    amount: formData.get("amount"),
    contributedOn: formData.get("contributedOn") || todayISODate(),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: goal } = await supabase
    .from("saving_goals")
    .select("*")
    .eq("id", parsed.data.goalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!goal) return { error: "Meta no encontrada." };

  const { error: contribError } = await supabase.from("goal_contributions").insert({
    user_id: user.id,
    goal_id: goal.id,
    amount: parsed.data.amount,
    contributed_on: parsed.data.contributedOn,
    note: parsed.data.note || null,
  });

  if (contribError) return { error: "No se pudo registrar el aporte." };

  // current_amount + status synced by DB trigger from contributions
  revalidateFinance();
  return { success: "Aporte registrado." };
}

export async function deleteGoalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase.from("saving_goals").delete().eq("id", id).eq("user_id", user.id);
  revalidateFinance();
}

export async function updateGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = goalSchema.safeParse({
    name: formData.get("name"),
    targetAmount: formData.get("targetAmount"),
    targetDate: formData.get("targetDate") ?? "",
  });

  if (!id) return { error: "Meta inválida." };
  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: goal } = await supabase
    .from("saving_goals")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!goal) return { error: "Meta no encontrada." };

  if (parsed.data.targetAmount < Number(goal.current_amount)) {
    return {
      error: "El objetivo no puede ser menor al monto ya acumulado.",
    };
  }

  const status =
    Number(goal.current_amount) >= parsed.data.targetAmount
      ? "completed"
      : goal.status === "completed"
        ? "active"
        : goal.status;

  const { error } = await supabase
    .from("saving_goals")
    .update({
      name: parsed.data.name,
      target_amount: parsed.data.targetAmount,
      target_date: parsed.data.targetDate || null,
      status,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo actualizar la meta." };

  revalidateFinance();
  return { success: "Meta actualizada." };
}

export async function archiveGoalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase
    .from("saving_goals")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidateFinance();
}

export async function completeGoalAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase
    .from("saving_goals")
    .update({ status: "completed" })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidateFinance();
}

export async function createDebtAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = debtSchema.safeParse({
    name: formData.get("name"),
    creditor: formData.get("creditor") ?? "",
    originalAmount: formData.get("originalAmount"),
    installmentAmount: formData.get("installmentAmount") || undefined,
    nextPaymentDate: formData.get("nextPaymentDate") ?? "",
    notes: formData.get("notes") ?? "",
    linkedAccountId: formData.get("linkedAccountId") ?? "",
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    name: parsed.data.name,
    creditor: parsed.data.creditor || null,
    original_amount: parsed.data.originalAmount,
    installment_amount: parsed.data.installmentAmount || null,
    next_payment_date: parsed.data.nextPaymentDate || null,
    notes: parsed.data.notes || null,
    linked_account_id: parsed.data.linkedAccountId || null,
  });

  if (error) return { error: "No se pudo crear la deuda." };

  revalidateFinance();
  return { success: "Deuda registrada." };
}

export async function payDebtAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = debtPaymentSchema.safeParse({
    debtId: formData.get("debtId"),
    amount: formData.get("amount"),
    paidOn: formData.get("paidOn") || todayISODate(),
    accountId: formData.get("accountId"),
    note: formData.get("note") ?? "",
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("pay_debt", {
    p_debt_id: parsed.data.debtId,
    p_account_id: parsed.data.accountId,
    p_amount: parsed.data.amount,
    p_paid_on: parsed.data.paidOn,
    p_note: parsed.data.note || null,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("payment_exceeds_pending")) {
      return { error: "El pago supera el saldo pendiente." };
    }
    if (msg.includes("insufficient_funds")) {
      return { error: "Saldo insuficiente." };
    }
    if (msg.includes("currency_mismatch")) {
      return { error: "La moneda de la cuenta no coincide con la deuda vinculada." };
    }
    if (msg.includes("invalid_payment_account")) {
      return { error: "Selecciona una cuenta de activo para pagar." };
    }
    return { error: "No se pudo registrar el pago." };
  }

  revalidateFinance();
  return { success: "Pago registrado." };
}

export async function deleteDebtAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase.from("debts").delete().eq("id", id).eq("user_id", user.id);
  revalidateFinance();
}

export async function updateDebtAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = debtSchema.safeParse({
    name: formData.get("name"),
    creditor: formData.get("creditor") ?? "",
    originalAmount: formData.get("originalAmount"),
    installmentAmount: formData.get("installmentAmount") || undefined,
    nextPaymentDate: formData.get("nextPaymentDate") ?? "",
    notes: formData.get("notes") ?? "",
    linkedAccountId: formData.get("linkedAccountId") ?? "",
  });

  if (!id) return { error: "Deuda inválida." };
  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const { data: debt } = await supabase
    .from("debts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!debt) return { error: "Deuda no encontrada." };

  if (parsed.data.originalAmount < Number(debt.paid_amount)) {
    return {
      error: "El monto original no puede ser menor a lo ya pagado.",
    };
  }

  const paid = Number(debt.paid_amount);
  const status =
    paid >= parsed.data.originalAmount
      ? "paid"
      : debt.status === "paid"
        ? "active"
        : debt.status;

  const { error } = await supabase
    .from("debts")
    .update({
      name: parsed.data.name,
      creditor: parsed.data.creditor || null,
      original_amount: parsed.data.originalAmount,
      installment_amount: parsed.data.installmentAmount || null,
      next_payment_date: parsed.data.nextPaymentDate || null,
      notes: parsed.data.notes || null,
      linked_account_id: parsed.data.linkedAccountId || null,
      status,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "No se pudo actualizar la deuda." };

  revalidateFinance();
  return { success: "Deuda actualizada." };
}

export async function archiveDebtAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase
    .from("debts")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidateFinance();
}

export async function markDebtPaidAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();

  const { data: debt } = await supabase
    .from("debts")
    .select("id, original_amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!debt) return;

  await supabase
    .from("debts")
    .update({
      paid_amount: debt.original_amount,
      status: "paid",
    })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidateFinance();
}

export async function createRecurringAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = recurringSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    accountId: formData.get("accountId"),
    counterpartyAccountId: formData.get("counterpartyAccountId") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    description: formData.get("description") ?? "",
    note: formData.get("note") ?? "",
    frequency: formData.get("frequency"),
    nextOccurrence: formData.get("nextOccurrence"),
    endDate: formData.get("endDate") ?? "",
  });

  if (!parsed.success) return mapZodErrors(parsed.error);

  const { supabase, user } = await requireUser();

  const accountIds = [parsed.data.accountId];
  if (parsed.data.counterpartyAccountId) {
    accountIds.push(parsed.data.counterpartyAccountId);
  }

  const { data: accounts } = await supabase
    .from("financial_accounts")
    .select("id, status, currency")
    .eq("user_id", user.id)
    .in("id", accountIds);

  if ((accounts?.length ?? 0) !== accountIds.length) {
    return { error: "Cuenta no válida." };
  }

  if (parsed.data.type === "transfer" && parsed.data.counterpartyAccountId) {
    const from = accounts!.find((a) => a.id === parsed.data.accountId);
    const to = accounts!.find(
      (a) => a.id === parsed.data.counterpartyAccountId,
    );
    if (!from || !to || from.currency !== to.currency) {
      return { error: "Las cuentas deben usar la misma moneda." };
    }
  }

  if (parsed.data.type !== "transfer" && parsed.data.categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id, kind")
      .eq("id", parsed.data.categoryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!category || category.kind !== parsed.data.type) {
      return { error: "Categoría no válida." };
    }
  }

  const { error } = await supabase.from("recurring_transactions").insert({
    user_id: user.id,
    type: parsed.data.type,
    amount: parsed.data.amount,
    account_id: parsed.data.accountId,
    counterparty_account_id:
      parsed.data.type === "transfer"
        ? parsed.data.counterpartyAccountId || null
        : null,
    category_id:
      parsed.data.type === "transfer" ? null : parsed.data.categoryId || null,
    description: parsed.data.description || null,
    note: parsed.data.note || null,
    frequency: parsed.data.frequency,
    next_occurrence: parsed.data.nextOccurrence,
    end_date: parsed.data.endDate || null,
  });

  if (error) return { error: "No se pudo crear el movimiento recurrente." };

  revalidateFinance();
  return { success: "Recurrencia creada." };
}

export async function pauseRecurringAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase
    .from("recurring_transactions")
    .update({ status: "paused" })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidateFinance();
}

export async function resumeRecurringAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase
    .from("recurring_transactions")
    .update({ status: "active" })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidateFinance();
}

export async function cancelRecurringAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await requireUser();
  await supabase
    .from("recurring_transactions")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidateFinance();
}

export async function generateRecurringAction(): Promise<ActionState> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc(
    "generate_due_recurring_transactions",
    { p_as_of: todayISODate() },
  );

  if (error) {
    return { error: "No se pudieron generar los movimientos recurrentes." };
  }

  revalidateFinance();
  return {
    success:
      Number(data) > 0
        ? `Se generaron ${data} movimiento(s).`
        : "No hay recurrencias pendientes.",
  };
}
