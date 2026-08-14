import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "./auth";

describe("loginSchema", () => {
  it("akzeptiert gültige Eingaben", () => {
    expect(loginSchema.safeParse({ email: "a@b.de", password: "geheim1" }).success).toBe(true);
  });

  it("lehnt ein ungültiges E-Mail-Format ab", () => {
    expect(loginSchema.safeParse({ email: "keine-email", password: "geheim1" }).success).toBe(
      false,
    );
  });

  it("lehnt ein zu kurzes Passwort ab", () => {
    expect(loginSchema.safeParse({ email: "a@b.de", password: "123" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("akzeptiert eine gültige E-Mail", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.de" }).success).toBe(true);
  });

  it("lehnt eine ungültige E-Mail ab", () => {
    expect(forgotPasswordSchema.safeParse({ email: "keine-email" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("akzeptiert übereinstimmende Passwörter", () => {
    const result = resetPasswordSchema.safeParse({
      password: "geheim1",
      confirmPassword: "geheim1",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt nicht übereinstimmende Passwörter ab", () => {
    const result = resetPasswordSchema.safeParse({
      password: "geheim1",
      confirmPassword: "anders1",
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("akzeptiert gültige, übereinstimmende Eingaben", () => {
    const result = signupSchema.safeParse({
      email: "a@b.de",
      password: "geheim1",
      confirmPassword: "geheim1",
    });
    expect(result.success).toBe(true);
  });

  it("lehnt nicht übereinstimmende Passwörter ab", () => {
    const result = signupSchema.safeParse({
      email: "a@b.de",
      password: "geheim1",
      confirmPassword: "anders1",
    });
    expect(result.success).toBe(false);
  });

  it("lehnt eine ungültige E-Mail ab", () => {
    const result = signupSchema.safeParse({
      email: "keine-email",
      password: "geheim1",
      confirmPassword: "geheim1",
    });
    expect(result.success).toBe(false);
  });
});
