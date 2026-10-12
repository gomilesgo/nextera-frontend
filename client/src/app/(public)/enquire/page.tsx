import type { Metadata } from "next";
import Link from "next/link";
import { EnquiryForm } from "@/components/enquire/EnquiryForm";
import { brand } from "@/lib/site";

export const metadata: Metadata = {
  title: "Enquire",
  description: `Ask the ${brand.name} team about fixed-return plans. We will call you back.`,
  alternates: { canonical: "/enquire" },
};

export default function EnquirePage() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="orbit-glow absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-[1320px] gap-12 px-4 pb-20 pt-32 sm:px-6 md:px-8 md:pt-40 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div>
          <p className="eyebrow">Enquire</p>
          <h1 className="mt-4 font-display h-display">Talk to a person before you invest.</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-parchment/80">
            Leave your number and our team will call you to walk through the plans, the KYC steps and how
            monthly credits and withdrawals work.
          </p>
          <div className="gold-rule my-10 max-w-sm" />
          <dl className="grid max-w-sm gap-6 text-sm">
            <div>
              <dt className="label">Already a customer?</dt>
              <dd className="mt-2">
                <Link href="/portal/login" className="text-gold underline">
                  Sign in to your portal
                </Link>
              </dd>
            </div>
            <div>
              <dt className="label">Email</dt>
              <dd className="mt-2">
                <a href={`mailto:${brand.email}`} className="text-parchment/85 hover:text-gold">
                  {brand.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="label">Office</dt>
              <dd className="mt-2 text-parchment/75">{brand.city}</dd>
            </div>
          </dl>
        </div>
        <EnquiryForm />
      </div>
    </section>
  );
}
