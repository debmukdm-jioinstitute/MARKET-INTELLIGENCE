import { z } from "zod";

export const upstoxApiImportSchema = z.object({
  mode: z.literal("api"),
  accessToken: z.string().min(1, "Access Token is required").max(2000, "Access Token too long"),
});

export const upstoxCsvImportSchema = z.object({
  mode: z.literal("csv"),
  csvText: z.string().min(10, "CSV content is too short").max(2_000_000, "CSV content exceeds size limit"),
});

export const upstoxImportSchema = z.discriminatedUnion("mode", [
  upstoxApiImportSchema,
  upstoxCsvImportSchema,
]);

export type UpstoxImportInput = z.infer<typeof upstoxImportSchema>;
