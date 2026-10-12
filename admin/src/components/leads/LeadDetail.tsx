"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatPaise } from "@nextera/contracts";
import { DetailItem } from "@/components/desk/DetailItem";
import { PlainText } from "@/components/desk/PlainText";
import { ConvertLead } from "@/components/leads/ConvertLead";
import { LeadWorkflow } from "@/components/leads/LeadWorkflow";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/format";
import { leadSourceLabels, leadStatusLabels, leadStatusTones, maskIp } from "@/lib/leads/labels";
import { usePlans } from "@/lib/queries/hooks";
import { leadQueries } from "@/lib/queries/leads";

export function LeadDetail({ leadId, canWrite }: { leadId: string; canWrite: boolean }) {
  const { data, error, isPending } = useQuery(leadQueries.detail(leadId));
  const plans = usePlans();

  if (isPending) return <p className="text-sm text-dust">Loading lead…</p>;
  if (!data) return <Notice tone="error">{error?.message ?? "Lead not found"}</Notice>;

  const { lead } = data;
  const plan = lead.planId ? plans.data?.plans.find((candidate) => candidate.id === lead.planId) : undefined;

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow={`Lead ${lead.ref}`}
        title={lead.name}
        description={`Received ${formatDateTime(lead.createdAt)} · ${leadSourceLabels[lead.source]}`}
        actions={
          <>
            <Badge tone={leadStatusTones[lead.status]}>{leadStatusLabels[lead.status]}</Badge>
            <ButtonLink href="/leads" variant="ghost" size="sm">
              Back to leads
            </ButtonLink>
          </>
        }
      />

      {error ? <p className="text-xs text-ember">Showing cached data: {error.message}</p> : null}

      {lead.convertedCustomerId ? (
        <Notice tone="success">
          Converted {formatDateTime(lead.convertedAt)}.{" "}
          <Link href={`/customers/${lead.convertedCustomerId}`} className="underline hover:text-gold">
            Open the customer
          </Link>
        </Notice>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="enquiry-heading" className="grid content-start gap-3">
          <h2 id="enquiry-heading" className="eyebrow">
            Enquiry
          </h2>
          <dl className="hairline grid gap-x-6 gap-y-4 rounded-[3px] bg-horizon/40 p-5 sm:grid-cols-2">
            <DetailItem label="Mobile">
              <a href={`tel:${lead.phone}`} className="font-mono hover:text-gold">
                {lead.phone}
              </a>
            </DetailItem>
            <DetailItem label="Email">
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="hover:text-gold">
                  {lead.email}
                </a>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Interest">{lead.interest ?? "—"}</DetailItem>
            <DetailItem label="Plan">{lead.planId ? (plan?.name ?? "Unknown plan") : "—"}</DetailItem>
            <DetailItem label="Amount">{lead.amountPaise === null ? "—" : formatPaise(lead.amountPaise)}</DetailItem>
            <DetailItem label="Page">{lead.path ? <span className="font-mono text-xs">{lead.path}</span> : "—"}</DetailItem>
            <DetailItem label="Message" wide>
              {lead.message ? <PlainText text={lead.message} /> : "—"}
            </DetailItem>
            <DetailItem label="Network">
              <span className="font-mono text-xs" title="The last part of the address is hidden">
                {maskIp(lead.ip)}
              </span>
            </DetailItem>
            <DetailItem label="Device">
              <span className="line-clamp-2 text-xs text-dust" title={lead.userAgent ?? undefined}>
                {lead.userAgent ?? "—"}
              </span>
            </DetailItem>
            <DetailItem label="Last updated">{formatDateTime(lead.updatedAt)}</DetailItem>
          </dl>
        </section>

        <aside aria-label="Lead actions" className="grid content-start gap-4">
          {canWrite ? (
            <>
              <LeadWorkflow lead={lead} />
              <ConvertLead lead={lead} />
            </>
          ) : (
            <Notice>You have read-only access to leads.</Notice>
          )}
        </aside>
      </div>
    </div>
  );
}
