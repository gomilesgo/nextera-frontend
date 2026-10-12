import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/LoginForm";
import { firstParam, safeNextPath } from "@/lib/request";
import { getStaffSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(firstParam(params.next));
  const expired = firstParam(params.expired) !== undefined;

  const session = await getStaffSession();
  if (session.status === "signed_in") redirect(next);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="eyebrow">Srahira · Nextera</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Staff sign in</h1>
          <p className="mt-1 text-sm text-dust">
            Use your email, password and the code from your authenticator app.
          </p>
        </div>
        <div className="hairline rounded-[3px] bg-horizon/60 p-6">
          <LoginForm
            next={next}
            notice={expired ? "Your session has ended. Please sign in again." : undefined}
          />
        </div>
      </div>
    </main>
  );
}
