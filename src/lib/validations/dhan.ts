import { z } from "zod";

export const dhanApiImportSchema = z.object({
  mode: z.literal("api"),
  clientId: z.string().min(1, "Client ID is required").max(60, "Client ID too long"),
  accessToken: z.string().min(1, "Access Token is required").max(2000, "Access Token too long"),
});

export const dhanCsvImportSchema = z.object({
  mode: z.literal("csv"),
  csvText: z.string().min(10, "CSV content is too short").max(2_000_000, "CSV content exceeds size limit"),
});

export const dhanImportSchema = z.discriminatedUnion("mode", [
  dhanApiImportSchema,
  dhanCsvImportSchema,
]);

export type DhanImportInput = z.infer<typeof dhanImportSchema>;
