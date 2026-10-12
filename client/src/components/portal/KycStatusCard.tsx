import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { kycCopy } from "@/lib/customer";
import type { KycTone } from "@/lib/customer";
import { formatIsoDate, formatTimestamp } from "@/lib/dates";
import type { PortalKyc } from "@/lib/kyc";

export const kycBadgeTone: Record<KycTone, BadgeTone> = {
  neutral: "warning",
  info: "info",
  success: "success",
  danger: "danger",
};

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className={mono ? "mt-1.5 break-words font-mono text-sm tracking-[0.08em] text-parchment tnum" : "mt-1.5 break-words text-parchment"}>
        {value}
      </dd>
    </div>
  );
}

export function KycStatusCard({ kyc }: { kyc: PortalKyc }) {
  const copy = kycCopy[kyc.kycStatus];
  const profile = kyc.profile;
  const submitted = profile ? formatTimestamp(profile.submittedAt) : null;
  const verified = profile?.verifiedAt ? formatTimestamp(profile.verifiedAt) : null;

  return (
    <section aria-labelledby="kyc-status-heading" className="hairline rounded-[2px] bg-horizon p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="kyc-status-heading" className="label">
          KYC status
        </h2>
        <Badge tone={kycBadgeTone[copy.tone]}>{copy.label}</Badge>
      </div>
      <p className="mt-5 max-w-2xl leading-7 text-parchment/80">{copy.body}</p>

      {kyc.kycStatus === "rejected" && profile?.rejectionReason ? (
        <div className="mt-6 rounded-[2px] border border-ember/45 bg-ember/10 px-4 py-3 text-sm leading-6">
          <p className="font-medium text-parchment">Reason from our team</p>
          <p className="mt-1 whitespace-pre-line break-words text-parchment/85">{profile.rejectionReason}</p>
        </div>
      ) : null}

      {profile ? (
        <dl className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="PAN" value={profile.panMasked} mono />
          <Detail label="Name on PAN" value={profile.panName} />
          {profile.dob ? <Detail label="Date of birth" value={formatIsoDate(profile.dob)} /> : null}
          <Detail label={verified ? "Verified on" : "Submitted on"} value={verified ?? submitted ?? "—"} />
        </dl>
      ) : null}
    </section>
  );
}
