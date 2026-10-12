export const queryKeys = {
  all: ["nextera"] as const,
  me: () => [...queryKeys.all, "me"] as const,
  plans: {
    all: () => [...queryKeys.all, "plans"] as const,
    list: () => [...queryKeys.plans.all(), "list"] as const,
    detail: (slug: string) => [...queryKeys.plans.all(), "detail", slug] as const,
  },
  investments: {
    all: () => [...queryKeys.all, "investments"] as const,
    list: () => [...queryKeys.investments.all(), "list"] as const,
    summary: () => [...queryKeys.investments.all(), "summary"] as const,
    detail: (id: string) => [...queryKeys.investments.all(), "detail", id] as const,
    payment: (id: string) => [...queryKeys.investments.all(), "payment", id] as const,
  },
  documents: {
    all: () => [...queryKeys.all, "documents"] as const,
    list: () => [...queryKeys.documents.all(), "list"] as const,
  },
  statements: {
    all: () => [...queryKeys.all, "statements"] as const,
    list: () => [...queryKeys.statements.all(), "list"] as const,
  },
  kyc: () => [...queryKeys.all, "kyc"] as const,
  bankAccounts: {
    all: () => [...queryKeys.all, "bank-accounts"] as const,
    list: () => [...queryKeys.bankAccounts.all(), "list"] as const,
  },
  wallet: {
    all: () => [...queryKeys.all, "wallet"] as const,
    balance: () => [...queryKeys.wallet.all(), "balance"] as const,
    withdrawals: () => [...queryKeys.wallet.all(), "withdrawals"] as const,
    transactions: () => [...queryKeys.wallet.all(), "transactions"] as const,
  },
};
