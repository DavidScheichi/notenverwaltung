import { z } from "zod";

export const studentSchema = z.object({
  first_name: z.string().min(1, "Vorname fehlt.").max(80),
  last_name: z.string().min(1, "Nachname fehlt.").max(80),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export type StudentInput = z.infer<typeof studentSchema>;

