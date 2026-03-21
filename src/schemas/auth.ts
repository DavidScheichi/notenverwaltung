import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail eingeben."),
  password: z.string().min(6, "Mindestens 6 Zeichen."),
});

export type LoginInput = z.infer<typeof loginSchema>;

