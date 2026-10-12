import { customerLedgerQuerySchema } from "@nextera/contracts";
import { withStaff } from "@/lib/api/handler";
import { errorResponse } from "@/lib/api/respond";
import { parseSearchQuery } from "@/lib/api/searchQuery";
import { downloadFromBackend } from "@/lib/backend/download";
import { customerBackendPath } from "@/lib/customers/api";
import { csvDownloadHeaders, ledgerCsvFilename } from "@/lib/customers/export";
import { isCustomerId } from "@/lib/customers/shape";
import { withSearch } from "@/lib/listing/params";

const exportQuerySchema = customerLedgerQuerySchema.pick({ account: true });

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/customers/[id]/ledger/export">,
): Promise<Response> {
  const { id } = await params;
  return withStaff("customers.view", async ({ token }) => {
    if (!isCustomerId(id)) return errorResponse({ code: "not_found", message: "Customer not found" });
    const query = parseSearchQuery(request, exportQuerySchema);
    if (!query.ok) return query.response;
    const account = query.data.account;
    const search = account ? new URLSearchParams({ account }).toString() : "";
    const result = await downloadFromBackend(withSearch(customerBackendPath(id, "/ledger.csv"), search), {
      token,
      accept: "text/csv",
    });
    if (!result.ok) return errorResponse(result.error, result.status);
    return new Response(result.body, {
      status: 200,
      headers: csvDownloadHeaders(ledgerCsvFilename(id, account, new Date())),
    });
  });
}
