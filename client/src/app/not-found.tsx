import { BrandLink } from "@/components/brand/BrandLink";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-svh flex-col">
      <div className="orbit-glow absolute inset-0 -z-10" />
      <header className="mx-auto w-full max-w-[1320px] px-4 py-4 sm:px-6 md:px-8">
        <BrandLink />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-lg text-center">
          <p className="eyebrow">404</p>
          <h1 className="mt-4 font-display h-section">This page drifted out of orbit.</h1>
          <p className="mt-4 text-parchment/75">The link may be old or mistyped.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/">Back to Nextera</ButtonLink>
            <ButtonLink href="/portal/login" variant="ghost">
              Sign in
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
