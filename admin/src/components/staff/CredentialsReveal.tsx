"use client";

import { useState } from "react";
import type { IssuedCredentials } from "@/app/(console)/staff/actions";
import { QrCode } from "@/components/staff/QrCode";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { clearClipboard, groupSecret } from "@/lib/team/labels";

function CopyValue({
  label,
  value,
  display,
  onCopied,
}: {
  label: string;
  value: string;
  display?: string;
  onCopied: () => void;
}) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("copied");
      onCopied();
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="grid gap-1.5">
      <p className="eyebrow">{label}</p>
      <div className="flex items-center gap-2">
        <code className="hairline min-w-0 flex-1 rounded-[3px] bg-ink px-3 py-2 font-mono text-sm break-all select-all">
          {display ?? value}
        </code>
        <Button variant="secondary" size="sm" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`}>
          Copy
        </Button>
      </div>
      <p aria-live="polite" className="min-h-4 text-xs text-dust">
        {copied === "copied" ? "Copied." : copied === "failed" ? "Copy failed. Select the text instead." : ""}
      </p>
    </div>
  );
}

export function CredentialsReveal({
  credentials,
  purpose,
  onDone,
}: {
  credentials: IssuedCredentials;
  purpose: "invite" | "reset";
  onDone: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [copiedAny, setCopiedAny] = useState(false);
  const { staff } = credentials;

  function done() {
    if (copiedAny) clearClipboard(navigator.clipboard);
    onDone();
  }

  return (
    <div className="grid gap-4">
      <Notice tone="error">
        These credentials are shown once and cannot be retrieved later. Share them with {staff.name} over a secure
        channel. If they are lost, reset the credentials again.
      </Notice>
      <dl className="grid gap-1 text-sm">
        <dt className="eyebrow">{purpose === "invite" ? "Invited" : "Reset for"}</dt>
        <dd>
          {staff.name} <span className="text-dust">· {staff.email}</span>
        </dd>
      </dl>
      <CopyValue label="Temporary password" value={credentials.temporaryPassword} onCopied={() => setCopiedAny(true)} />
      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        <QrCode qr={credentials.qr} label={`Authenticator QR code for ${staff.email}`} />
        <div className="grid gap-2">
          <p className="text-sm text-dust">
            Scan with an authenticator app, or enter the setup key by hand. They must change the temporary password
            when they first sign in.
          </p>
          <CopyValue
            label="Authenticator setup key"
            value={credentials.totpSecret}
            display={groupSecret(credentials.totpSecret)}
            onCopied={() => setCopiedAny(true)}
          />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
          className="mt-0.5 size-4 accent-gold"
        />
        <span>I have securely passed these credentials to {staff.name}.</span>
      </label>
      <div className="flex justify-end border-t border-border pt-4">
        <Button onClick={done} disabled={!saved}>
          Done
        </Button>
      </div>
    </div>
  );
}
