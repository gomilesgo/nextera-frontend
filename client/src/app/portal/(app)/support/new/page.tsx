import type { Metadata } from "next";
import Link from "next/link";
import { NewTicketForm } from "@/components/support/NewTicketForm";
import { requireCustomer } from "@/lib/session";

export const metadata: Metadata = { title: "New support request" };

export default async function NewSupportRequestPage() {
  await requireCustomer();

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <nav aria-label="Breadcrumb">
        <Link href="/portal/support" className="text-sm text-dust hover:text-lagoon">
          <span aria-hidden="true">← </span>All requests
        </Link>
      </nav>
      <header>
        <p className="eyebrow">Support</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3rem)] leading-tight">New request</h1>
        <p className="mt-3 max-w-2xl text-parchment/75">
          Tell us what you need help with. We reply here, usually within one working day, and you can add more details
          at any time.
        </p>
      </header>
      <NewTicketForm />
    </div>
  );
}
