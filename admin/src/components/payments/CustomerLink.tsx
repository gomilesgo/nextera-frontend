import Link from "next/link";
import { shortId } from "@/lib/format";

export function CustomerLink({ customerId, label }: { customerId: string; label?: string | null }) {
  return (
    <Link
      href={`/customers/${customerId}`}
      className="hover:text-gold"
      title={customerId}
      aria-label={label ? undefined : `Customer ${customerId}`}
    >
      {label ?? <span className="font-mono text-xs">{shortId(customerId)}</span>}
    </Link>
  );
}
