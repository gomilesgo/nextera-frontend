import { ButtonLink } from "@/components/ui/Button";

export function PortalNotFoundPanel() {
  return (
    <div className="mx-auto grid max-w-xl gap-6 py-16 text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="font-display text-3xl">This page is not available.</h1>
      <p className="text-parchment/75">The plan may have closed, or the link may be out of date.</p>
      <div className="flex justify-center">
        <ButtonLink href="/portal/plans">See open plans</ButtonLink>
      </div>
    </div>
  );
}
