const istDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function slug(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
}

export function ledgerCsvFilename(customerId: string, account: string | undefined, now: Date): string {
  const parts = ["nextera", "customer", slug(customerId), "ledger"];
  const accountPart = account ? slug(account) : "";
  if (accountPart) parts.push(accountPart);
  parts.push(istDate.format(now));
  return `${parts.join("-")}.csv`;
}

export function csvDownloadHeaders(filename: string): Record<string, string> {
  return {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
}

export function filenameFromDisposition(header: string | null, fallback: string): string {
  const match = header ? /filename="([^"]+)"/.exec(header) : null;
  const name = match?.[1];
  return name && /^[A-Za-z0-9._-]+$/.test(name) ? name : fallback;
}
