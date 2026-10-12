"use client";

import { useId, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { investmentFileUrl } from "@/lib/queries/documents";
import { ConsentForm } from "./ConsentForm";

export function AgreementStep({
  investmentId,
  phone,
  onAccepted,
}: {
  investmentId: string;
  phone: string | null;
  onAccepted: () => void;
}) {
  const [read, setRead] = useState(false);
  const checkboxId = useId();
  const previewUrl = investmentFileUrl(investmentId, "agreement");

  return (
    <section aria-labelledby="agreement-heading" className="grid gap-6">
      <div>
        <h2 id="agreement-heading" className="font-display text-2xl sm:text-3xl">
          Review your agreement
        </h2>
        <p className="mt-2 max-w-2xl leading-7 text-parchment/75">
          This agreement records your amount, rate, tenure and payout terms. Read it in full, then accept it with a one-time
          code sent to your mobile.
        </p>
      </div>

      <div className="hairline overflow-hidden rounded-[2px] bg-horizon">
        <iframe
          src={previewUrl}
          title="Investment agreement (PDF)"
          className="hidden h-[70vh] min-h-[28rem] w-full bg-parchment md:block"
        />
        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between md:border-t">
          <p className="text-sm text-dust md:hidden">Open the agreement to read it on your phone.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={previewUrl} target="_blank" rel="noopener" className={buttonClass("ghost", "md")}>
              Open agreement
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={investmentFileUrl(investmentId, "agreement", true)} download className={buttonClass("quiet", "md")}>
              Download PDF
            </a>
          </div>
        </div>
      </div>

      <div className="hairline grid gap-6 rounded-[2px] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <input
            id={checkboxId}
            type="checkbox"
            checked={read}
            onChange={(event) => setRead(event.target.checked)}
            className="mt-1 size-5 shrink-0 accent-gold"
          />
          <label htmlFor={checkboxId} className="leading-7 text-parchment/85">
            I have read the agreement and understand that returns are paid monthly as simple interest and my principal is
            returned only at maturity.
          </label>
        </div>
        <ConsentForm investmentId={investmentId} phone={phone} ready={read} onAccepted={onAccepted} />
      </div>
    </section>
  );
}
