import { ButtonLink } from "@/components/ui/Button";

export function GatePanel({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <section aria-labelledby="gate-heading" className="hairline rounded-[2px] bg-horizon p-6 sm:p-8" role="status">
      <p className="eyebrow">Before you invest</p>
      <h2 id="gate-heading" className="mt-3 font-display text-2xl">
        {title}
      </h2>
      <p className="mt-3 max-w-xl leading-7 text-parchment/80">{body}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={href}>{cta}</ButtonLink>
        <ButtonLink href="/portal" variant="ghost">
          Back to dashboard
        </ButtonLink>
      </div>
    </section>
  );
}
