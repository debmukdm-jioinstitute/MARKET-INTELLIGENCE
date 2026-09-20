import { z } from "zod";

export const addHoldingSchema = z.object({
  market: z.enum(["IN", "US"]),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(25, "Symbol is too long")
    .regex(/^[A-Za-z0-9._^=-]+$/, "Invalid characters in symbol"),
  instrumentKey: z.string().max(100).nullable().optional(),
  name: z.string().min(1, "Name is required").max(120, "Name is too long").trim(),
  sector: z.string().max(100).nullable().optional(),
  currency: z.enum(["INR", "USD"]),
  shares: z
    .number()
    .positive("Shares must be greater than zero")
    .max(1_000_000_000, "Shares exceed maximum allowed amount"),
  avgCost: z
    .number()
    .positive("Average cost must be greater than zero")
    .max(100_000_000, "Average cost exceeds maximum allowed amount"),
  addedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "addedAt must be in YYYY-MM-DD format")
    .optional(),
});

export type AddHoldingInput = z.infer<typeof addHoldingSchema>;

export const updateHoldingSchema = z.object({
  shares: z
    .number()
    .positive("Shares must be greater than zero")
    .max(1_000_000_000, "Shares exceed maximum allowed amount")
    .optional(),
  avgCost: z
    .number()
    .positive("Average cost must be greater than zero")
    .max(100_000_000, "Average cost exceeds maximum allowed amount")
    .optional(),
});

export type UpdateHoldingInput = z.infer<typeof updateHoldingSchema>;

export const updateSettingsSchema = z.object({
  name: z.string().min(1, "Portfolio name cannot be empty").max(60, "Portfolio name is too long").trim().optional(),
  benchmark: z.enum(["NIFTY50", "SPX", "NDX"]).optional(),
  baseCurrency: z.literal("INR").optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const holdingItemSchema = z.object({
  id: z.string().min(1),
  market: z.enum(["IN", "US"]),
  symbol: z.string().min(1),
  instrumentKey: z.string().nullable().optional(),
  name: z.string().min(1),
  sector: z.string().nullable().optional(),
  currency: z.enum(["INR", "USD"]),
  shares: z.number().positive(),
  avgCost: z.number().positive(),
  addedAt: z.string().optional(),
});

export const tradeLogItemSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  shares: z.number().positive(),
  price: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const portfolioAnalysisSchema = z.object({
  holdings: z.array(holdingItemSchema).optional(),
  settings: updateSettingsSchema.optional(),
  tradeLog: z.array(tradeLogItemSchema).optional(),
});

export type PortfolioAnalysisInput = z.infer<typeof portfolioAnalysisSchema>;
