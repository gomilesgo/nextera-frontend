import { ButtonLink } from "@/components/ui/Button";

export function SupportNotFoundPanel() {
  return (
    <div className="mx-auto grid max-w-xl gap-6 py-16 text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="font-display text-3xl">We could not find this request.</h1>
      <p className="text-parchment/75">The link may be out of date, or the request may belong to another account.</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/portal/support">See your requests</ButtonLink>
        <ButtonLink href="/portal/support/new" variant="ghost">
          New request
        </ButtonLink>
      </div>
    </div>
  );
}
