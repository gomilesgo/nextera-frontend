import type { BankAccountStatus, CustomerStatus, KycStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import {
  bankStatusLabels,
  bankStatusTones,
  customerStatusLabels,
  customerStatusTones,
  kycStatusLabels,
  kycStatusTones,
} from "@/lib/customers/labels";

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  return <Badge tone={customerStatusTones[status]}>{customerStatusLabels[status]}</Badge>;
}

export function CustomerKycBadge({ status }: { status: KycStatus }) {
  return <Badge tone={kycStatusTones[status]}>KYC {kycStatusLabels[status].toLowerCase()}</Badge>;
}

export function BankStatusBadge({ status }: { status: BankAccountStatus }) {
  return <Badge tone={bankStatusTones[status]}>{bankStatusLabels[status]}</Badge>;
}
