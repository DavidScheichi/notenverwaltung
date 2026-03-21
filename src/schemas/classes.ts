import { z } from "zod";

export const classSchema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen.").max(80, "Maximal 80 Zeichen."),
});

export type ClassInput = z.infer<typeof classSchema>;

