const record = [
  {
    title: "Dashboard",
    body: "What is invested, what has been credited, what is in the wallet, and the date of the next credit.",
  },
  {
    title: "Each investment",
    body: "The schedule, the credits already made, and the credits still to come, against the agreement you signed.",
  },
  {
    title: "Wallet",
    body: "Credited returns collect here. At maturity, the principal does too. You request a withdrawal from this balance.",
  },
  {
    title: "Documents and statements",
    body: "The agreement, the bond certificate, and a statement of every payment, credit and withdrawal.",
  },
  {
    title: "Support",
    body: "If a credit, a document or a withdrawal does not look right, you open a request and we reply in the same thread.",
  },
];

export function Record() {
  return (
    <section id="record" className="border-t border-border bg-horizon/40" aria-labelledby="record-heading">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 section-y sm:px-6 md:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
        <div>
          <h2 id="record-heading" className="font-display h-section text-parchment">
            After you invest, the portal is the record.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-dust">
            You do not have to call us to know where a credit is. The figures the calculator showed are the ones the
            portal tracks, month by month.
          </p>
        </div>
        <dl className="grid gap-0 sm:grid-cols-2">
          {record.map((item, index) => (
            <div
              key={item.title}
              className={`border-t border-border py-6 sm:pr-10 ${index === record.length - 1 ? "sm:border-b" : ""} ${
                index % 2 === 1 ? "sm:border-l sm:pl-10 sm:pr-0" : ""
              }`}
            >
              <dt className="font-display text-xl text-parchment">{item.title}</dt>
              <dd className="mt-2 max-w-sm text-sm leading-6 text-parchment/70">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
