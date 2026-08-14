import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
  password: z.string().min(6, "Mindestens 6 Zeichen."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Mindestens 6 Zeichen."),
    confirmPassword: z.string().min(6, "Mindestens 6 Zeichen."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const signupSchema = z
  .object({
    email: z.string().email("Bitte eine gültige E-Mail eingeben."),
    password: z.string().min(6, "Mindestens 6 Zeichen."),
    confirmPassword: z.string().min(6, "Mindestens 6 Zeichen."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

