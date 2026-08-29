import { z } from "zod";

const money = z.coerce.number().positive("El monto debe ser mayor a 0").max(999_999_999.99);
const optionalNote = z.string().trim().max(500).optional().or(z.literal(""));

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Nombre obligatorio").max(100),
  type: z.enum(["bank", "savings", "cash", "credit_card", "wallet", "loan", "other"]),
  institution: z.string().trim().max(100).optional().or(z.literal("")),
  currency: z.string().trim().length(3, "Moneda inválida"),
  initialBalance: z.coerce.number().min(0, "El saldo no puede ser negativo"),
});

export const incomeExpenseSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: money,
  occurredOn: z.string().min(1, "Fecha obligatoria"),
  accountId: z.string().uuid("Cuenta inválida"),
  categoryId: z.string().uuid("Categoría inválida"),
  description: optionalNote,
  note: optionalNote,
  reimbursesTransactionId: z.string().uuid().optional().or(z.literal("")),
});

export const transferSchema = z.object({
  amount: money,
  occurredOn: z.string().min(1, "Fecha obligatoria"),
  fromAccountId: z.string().uuid("Cuenta origen inválida"),
  toAccountId: z.string().uuid("Cuenta destino inválida"),
  description: optionalNote,
  note: optionalNote,
}).refine((d) => d.fromAccountId !== d.toAccountId, {
  message: "Origen y destino deben ser distintas",
  path: ["toAccountId"],
});

export const adjustmentSchema = z.object({
  amount: money,
  occurredOn: z.string().min(1, "Fecha obligatoria"),
  accountId: z.string().uuid("Cuenta inválida"),
  direction: z.enum(["increase", "decrease"]),
  reason: z.string().trim().min(5, "Indica un motivo (mín. 5 caracteres)").max(500),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  kind: z.enum(["income", "expense"]),
  parentId: z.string().uuid().optional().or(z.literal("")),
});

export const budgetSchema = z.object({
  categoryId: z.string().uuid("Categoría inválida"),
  amountLimit: money,
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2000).max(2100),
});

export const goalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetAmount: money,
  targetDate: z.string().optional().or(z.literal("")),
});

export const goalContributionSchema = z.object({
  goalId: z.string().uuid(),
  amount: money,
  contributedOn: z.string().min(1),
  note: optionalNote,
});

export const debtSchema = z.object({
  name: z.string().trim().min(1).max(100),
  creditor: z.string().trim().max(100).optional().or(z.literal("")),
  originalAmount: money,
  installmentAmount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0).optional(),
  ),
  nextPaymentDate: z.string().optional().or(z.literal("")),
  notes: optionalNote,
  linkedAccountId: z.string().uuid().optional().or(z.literal("")),
});

export const debtPaymentSchema = z.object({
  debtId: z.string().uuid(),
  amount: money,
  paidOn: z.string().min(1),
  accountId: z.string().uuid("Cuenta de pago inválida"),
  note: optionalNote,
});

export const recurringSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: money,
    accountId: z.string().uuid("Cuenta inválida"),
    counterpartyAccountId: z.string().uuid().optional().or(z.literal("")),
    categoryId: z.string().uuid().optional().or(z.literal("")),
    description: optionalNote,
    note: optionalNote,
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    nextOccurrence: z.string().min(1, "Próxima fecha obligatoria"),
    endDate: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.type === "transfer") {
      if (!data.counterpartyAccountId) {
        ctx.addIssue({
          code: "custom",
          message: "Cuenta destino obligatoria",
          path: ["counterpartyAccountId"],
        });
      }
      if (data.accountId === data.counterpartyAccountId) {
        ctx.addIssue({
          code: "custom",
          message: "Origen y destino deben ser distintas",
          path: ["counterpartyAccountId"],
        });
      }
    } else if (!data.categoryId) {
      ctx.addIssue({
        code: "custom",
        message: "Categoría obligatoria",
        path: ["categoryId"],
      });
    }
  });
