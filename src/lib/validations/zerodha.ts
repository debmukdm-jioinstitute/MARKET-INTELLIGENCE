import { z } from "zod";

export const zerodhaApiImportSchema = z.object({
  mode: z.literal("api"),
  apiKey: z.string().min(1, "API Key is required").max(100, "API Key too long"),
  accessToken: z.string().min(1, "Access Token is required").max(250, "Access Token too long"),
});

export const zerodhaCsvImportSchema = z.object({
  mode: z.literal("csv"),
  csvText: z.string().min(10, "CSV content is too short").max(2_000_000, "CSV content exceeds size limit"),
});

export const zerodhaImportSchema = z.discriminatedUnion("mode", [
  zerodhaApiImportSchema,
  zerodhaCsvImportSchema,
]);

export type ZerodhaImportInput = z.infer<typeof zerodhaImportSchema>;
