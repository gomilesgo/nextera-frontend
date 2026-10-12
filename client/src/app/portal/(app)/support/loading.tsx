export default function SupportLoading() {
  return (
    <div className="grid gap-6" role="status" aria-live="polite">
      <span className="sr-only">Loading support…</span>
      <div aria-hidden="true" className="h-4 w-24 animate-pulse rounded-full bg-parchment/10 motion-reduce:animate-none" />
      <div aria-hidden="true" className="h-10 w-2/3 max-w-md animate-pulse rounded-[2px] bg-parchment/10 motion-reduce:animate-none" />
      <div aria-hidden="true" className="grid gap-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-24 animate-pulse rounded-[2px] bg-horizon/60 motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
