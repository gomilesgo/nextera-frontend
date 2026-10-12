"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { filenameFromDisposition } from "@/lib/customers/export";
import { ApiError } from "@/lib/queries/fetchJson";
import { ledgerExportUrl } from "@/lib/queries/customers";
import { EXPIRED_PATH, PASSWORD_PATH } from "@/lib/sessionCookie";

type ExportState = { status: "idle" } | { status: "working" } | { status: "error"; message: string } | { status: "done" };

async function readFailure(response: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const error = body && typeof body === "object" ? (body as { error?: { code?: unknown; message?: unknown } }).error : undefined;
  return new ApiError(response.status, {
    code: typeof error?.code === "string" ? error.code : "unavailable",
    message: typeof error?.message === "string" ? error.message : "The export failed. Please try again.",
  });
}

function exportMessage(error: ApiError): string {
  if (error.code === "export_too_large") return `${error.message} Choose a single account above and export again.`;
  if (error.status === 0) return "You appear to be offline. Please try again.";
  return error.message;
}

export function LedgerExportButton({ customerId, account }: { customerId: string; account?: string }) {
  const [state, setState] = useState<ExportState>({ status: "idle" });

  async function download() {
    setState({ status: "working" });
    let response: Response;
    try {
      response = await fetch(ledgerExportUrl(customerId, account), {
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "text/csv" },
      });
    } catch {
      setState({ status: "error", message: "You appear to be offline. Please try again." });
      return;
    }
    if (!response.ok) {
      const failure = await readFailure(response);
      if (failure.status === 401) {
        window.location.assign(EXPIRED_PATH);
        return;
      }
      if (failure.code === "password_change_required") {
        window.location.assign(PASSWORD_PATH);
        return;
      }
      setState({ status: "error", message: exportMessage(failure) });
      return;
    }
    let blob: Blob;
    try {
      blob = await response.blob();
    } catch {
      setState({ status: "error", message: "The download was interrupted. Please try again." });
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filenameFromDisposition(response.headers.get("content-disposition"), "ledger.csv");
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setState({ status: "done" });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        size="sm"
        onClick={download}
        disabled={state.status === "working"}
        aria-busy={state.status === "working"}
      >
        {state.status === "working" ? "Preparing CSV…" : "Export CSV"}
      </Button>
      <p aria-live="polite" className="max-w-80 text-right text-xs">
        {state.status === "error" ? <span className="text-ember">{state.message}</span> : null}
        {state.status === "done" ? <span className="text-dust">CSV downloaded.</span> : null}
      </p>
    </div>
  );
}
