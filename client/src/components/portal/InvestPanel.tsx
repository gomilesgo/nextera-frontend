import type { KycStatus } from "@nextera/contracts";
import { ButtonLink } from "@/components/ui/Button";
import { kycCopy } from "@/lib/customer";

const reason: Record<KycStatus, string> = {
  none: "Investing opens once your KYC is verified. Complete KYC from the KYC page in your portal.",
  submitted: "Investing opens as soon as our team finishes verifying your KYC.",
  verified: "Your KYC is verified. Choose your amount, accept your agreement with a one-time code and pay securely online.",
  rejected: "Investing opens once your KYC is verified. See the KYC page for what needs correcting and submit again.",
};

export function InvestPanel({ kycStatus, slug }: { kycStatus: KycStatus; slug: string }) {
  return (
    <section aria-labelledby="invest-heading" className="hairline rounded-[2px] bg-horizon p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 id="invest-heading" className="font-display text-2xl">
          Invest
        </h2>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dust">
          KYC: {kycCopy[kycStatus].label}
        </span>
      </div>
      <p id="invest-reason" className="mt-4 leading-7 text-parchment/80">
        {reason[kycStatus]}
      </p>
      <ol className="mt-6 grid gap-2 text-sm text-dust">
        <li>1. Verify your PAN, address and bank account</li>
        <li>2. Review and accept your agreement with a one-time code</li>
        <li>3. Pay securely online; your bond certificate follows</li>
      </ol>
      <ButtonLink
        href={kycStatus === "verified" ? `/portal/invest/new/${slug}` : "/portal/kyc"}
        aria-describedby="invest-reason"
        size="lg"
        className="mt-8 w-full"
      >
        {kycStatus === "verified" ? "Invest in this plan" : kycStatus === "submitted" ? "View KYC status" : "Complete KYC"}
      </ButtonLink>
    </section>
  );
}
