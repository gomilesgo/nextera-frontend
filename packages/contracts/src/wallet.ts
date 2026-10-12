import { z } from "zod";

export const walletTransactionQuerySchema = z.object({
  cursor: z.string().trim().regex(/^\d{1,18}$/, "Invalid cursor").optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type WalletTransactionQuery = z.infer<typeof walletTransactionQuerySchema>;

export type WalletTransaction = {
  id: string;
  seq: number;
  at: string;
  account: string;
  direction: "debit" | "credit";
  amountPaise: number;
  description: string;
  refType: string;
  refId: string;
};

export type WalletTransactionPage = {
  transactions: WalletTransaction[];
  nextCursor: string | null;
};
