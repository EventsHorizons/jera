import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("registerSchema", () => {
  const valid = {
    displayName: "María López",
    email: "maria@example.com",
    password: "Password1",
    confirmPassword: "Password1",
    acceptTerms: true as const,
  };

  it("accepts valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects password mismatch", () => {
    expect(
      registerSchema.safeParse({
        ...valid,
        confirmPassword: "Password2",
      }).success,
    ).toBe(false);
  });

  it("rejects short password", () => {
    expect(
      registerSchema.safeParse({
        ...valid,
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });

  it("accepts 8-character password without special character rules", () => {
    expect(
      registerSchema.safeParse({
        ...valid,
        password: "abcdefgh",
        confirmPassword: "abcdefgh",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(
      registerSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects missing terms", () => {
    expect(
      registerSchema.safeParse({ ...valid, acceptTerms: false }).success,
    ).toBe(false);
  });

  it("rejects empty name", () => {
    expect(
      registerSchema.safeParse({ ...valid, displayName: " " }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires email and password", () => {
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "secret",
      }).success,
    ).toBe(true);
  });

  it("rejects empty password", () => {
    expect(
      loginSchema.safeParse({
        email: "user@example.com",
        password: "",
      }).success,
    ).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires valid email", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "a@b.com" }).success,
    ).toBe(true);
    expect(
      forgotPasswordSchema.safeParse({ email: "bad" }).success,
    ).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "Password1",
        confirmPassword: "Password1",
      }).success,
    ).toBe(true);
  });

  it("rejects mismatch", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "Password1",
        confirmPassword: "Password2",
      }).success,
    ).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("requires current password and matching new passwords", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "OldPass1",
        password: "Password1",
        confirmPassword: "Password1",
      }).success,
    ).toBe(true);
  });
});

describe("profileSchema", () => {
  it("validates display name and timezone", () => {
    expect(
      profileSchema.safeParse({
        displayName: "Ana",
        timezone: "America/Bogota",
      }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        displayName: "A",
        timezone: "UTC",
      }).success,
    ).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("requires ELIMINAR confirmation", () => {
    expect(
      deleteAccountSchema.safeParse({
        confirmation: "ELIMINAR",
        password: "Password1",
      }).success,
    ).toBe(true);
    expect(
      deleteAccountSchema.safeParse({
        confirmation: "eliminar",
        password: "Password1",
      }).success,
    ).toBe(false);
  });
});
