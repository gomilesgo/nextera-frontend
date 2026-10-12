import type { WithdrawalBulkResponse } from "@nextera/contracts";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";

export function BulkResultNotice({
  result,
  onDismiss,
}: {
  result: WithdrawalBulkResponse;
  onDismiss: () => void;
}) {
  const tone = result.failed === 0 ? "success" : result.succeeded === 0 ? "error" : "info";
  return (
    <div aria-live="polite">
      <Notice tone={tone}>
        <div className="flex items-start justify-between gap-3">
          <span>
            {result.succeeded > 0 ? `${result.succeeded} succeeded` : null}
            {result.succeeded > 0 && result.failed > 0 ? ", " : null}
            {result.failed > 0 ? `${result.failed} failed` : null}.
            {result.failed > 0 ? (
              <span className="ml-1 text-dust">
                Failed:{" "}
                {result.results
                  .filter((r) => !r.ok)
                  .map((r) => (!r.ok ? r.error.message : ""))
                  .filter(Boolean)
                  .join("; ")}
              </span>
            ) : null}
          </span>
          <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss">
            ✕
          </Button>
        </div>
      </Notice>
    </div>
  );
}
