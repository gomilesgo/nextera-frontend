import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLink } from "@/components/brand/BrandLink";
import { LoginForm } from "@/components/login/LoginForm";
import { Notice } from "@/components/ui/Notice";
import { safePortalPath } from "@/lib/request";
import { getCustomerSession } from "@/lib/session";
import { brand } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in" };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: PageProps<"/portal/login">) {
  const params = await searchParams;
  const next = safePortalPath(first(params.next));
  const expired = first(params.expired);
  const signedOut = first(params.signed_out) === "1";

  if (!expired) {
    const session = await getCustomerSession();
    if (session.status === "signed_in") redirect(next);
  }

  return (
    <div className="relative isolate flex min-h-svh flex-col">
      <div className="orbit-glow absolute inset-0 -z-10" />
      <header className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-8">
        <BrandLink />
        <Link href="/" className="text-sm text-dust hover:text-parchment">
          Back to {brand.name}
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <p className="eyebrow">Customer portal</p>
          <h1 className="mt-4 font-display text-[clamp(2rem,6vw,2.75rem)] leading-tight">Sign in with your mobile.</h1>
          <p className="mt-3 text-parchment/75">
            New to {brand.name}? Signing in for the first time creates your account.
          </p>
          <div className="hairline mt-8 rounded-[2px] bg-horizon/80 p-5 backdrop-blur-sm sm:p-8">
            {expired === "blocked" ? (
              <Notice tone="error" className="mb-6" title="This account is blocked">
                Please contact{" "}
                <a href={`mailto:${brand.email}`} className="text-gold underline">
                  {brand.email}
                </a>{" "}
                so we can help.
              </Notice>
            ) : expired ? (
              <Notice tone="info" className="mb-6">
                Your session has ended. Please sign in again.
              </Notice>
            ) : signedOut ? (
              <Notice tone="success" className="mb-6">
                You have signed out. See you soon.
              </Notice>
            ) : null}
            <LoginForm next={next} />
          </div>
          <p className="mt-6 text-xs leading-5 text-dust">
            By signing in you agree that we may contact you about your account by SMS. We never ask for your code
            over the phone.
          </p>
        </div>
      </main>
    </div>
  );
}
