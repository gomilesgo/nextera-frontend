import type { BankReviewQuery, KycQueueQuery } from "@nextera/contracts";
import { analyticsKeys } from "./analytics";
import { investmentKeys } from "./investments";
import { paymentKeys } from "./payments";
import { payablesKeys } from "./payables";
import { withdrawalKeys } from "./withdrawals";

export const queryKeys = {
  session: {
    all: ["session"] as const,
    me: () => [...queryKeys.session.all, "me"] as const,
  },
  plans: {
    all: ["plans"] as const,
    list: () => [...queryKeys.plans.all, "list"] as const,
    detail: (id: string) => [...queryKeys.plans.all, "detail", id] as const,
  },
  kyc: {
    all: ["kyc"] as const,
    queues: () => [...queryKeys.kyc.all, "queue"] as const,
    queue: (query: KycQueueQuery) => [...queryKeys.kyc.queues(), query.status, query.limit] as const,
    customer: (customerId: string) => [...queryKeys.kyc.all, "customer", customerId] as const,
  },
  bank: {
    all: ["bank"] as const,
    queues: () => [...queryKeys.bank.all, "queue"] as const,
    queue: (query: BankReviewQuery) => [...queryKeys.bank.queues(), query.status, query.limit] as const,
  },
  customers: {
    all: ["customers"] as const,
    detail: (customerId: string) => [...queryKeys.customers.all, "detail", customerId] as const,
  },
  staff: {
    all: ["staff"] as const,
    list: () => [...queryKeys.staff.all, "list"] as const,
    assignable: () => [...queryKeys.staff.all, "assignable"] as const,
  },
  settings: {
    all: ["settings"] as const,
    current: () => [...queryKeys.settings.all, "current"] as const,
  },
  investments: investmentKeys,
  payments: paymentKeys,
  withdrawals: withdrawalKeys,
  payables: payablesKeys,
  analytics: analyticsKeys,
};
