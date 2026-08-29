import { z } from "zod";

/** Temporary: min 8 for local/dev UX. Revisit length policy before production. */
const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña no puede superar 128 caracteres");

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede superar 80 caracteres"),
    email: z.string().trim().email("Correo electrónico inválido"),
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      error: "Debes aceptar los términos y condiciones",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Correo electrónico inválido"),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  timezone: z.string().min(1, "La zona horaria es obligatoria"),
  baseCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Moneda inválida")
    .regex(/^[A-Z]{3}$/, "Moneda inválida"),
});

export const deleteAccountSchema = z.object({
  confirmation: z.literal("ELIMINAR", {
    error: 'Escribe "ELIMINAR" para confirmar',
  }),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const firstAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "Máximo 100 caracteres"),
  type: z.enum(["bank", "savings", "cash", "credit_card", "wallet", "loan", "other"]),
  currency: z.string().length(3, "Moneda inválida"),
  initialBalance: z.coerce.number().min(0, "El saldo no puede ser negativo"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type FirstAccountInput = z.infer<typeof firstAccountSchema>;
