import { z } from "zod";

export const subjectSchema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen.").max(80),
  default_weight: z.coerce.number().min(0.1).max(20),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
