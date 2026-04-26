import { z } from "zod";

export const syllabusQuerySchema = z.object({
  subject: z
    .string()
    .transform((s) => s.toLowerCase())
    .optional(),
  room: z
    .string()
    .transform((s) => s.toLowerCase())
    .optional(),
  season: z.string().optional(),
  open_time: z.string().optional(),
});

export type SyllabusQueryParams = z.infer<typeof syllabusQuerySchema>;
