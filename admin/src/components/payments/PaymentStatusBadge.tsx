import type { PaymentStatus } from "@nextera/contracts";
import { Badge } from "@/components/ui/Badge";
import { paymentStatusLabels, paymentStatusTones } from "@/lib/payments/labels";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentStatusTones[status]}>{paymentStatusLabels[status]}</Badge>;
}
