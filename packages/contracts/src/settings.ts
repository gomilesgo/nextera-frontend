import { z } from "zod";

export const settingsSchema = z.object({
  tdsRateBps: z.number().int().min(0).max(5000, "TDS cannot exceed 50%"),
  minWithdrawalPaise: z.number().int().min(100, "Minimum withdrawal must be at least ₹1").max(Number.MAX_SAFE_INTEGER),
});

export const settingsUpdateSchema = settingsSchema
  .partial()
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, { message: "Nothing to update" });

export type Settings = z.infer<typeof settingsSchema>;
export type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
