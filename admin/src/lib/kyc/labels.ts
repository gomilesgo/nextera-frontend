import { kycQueueStatuses } from "@nextera/contracts";

export type KycQueueStatus = (typeof kycQueueStatuses)[number];

export const kycQueueTabs: readonly { value: KycQueueStatus; label: string }[] = [
  { value: "submitted", label: "Awaiting review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];
