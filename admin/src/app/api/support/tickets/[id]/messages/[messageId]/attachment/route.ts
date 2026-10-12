import { withStaff } from "@/lib/api/handler";
import { errorResponse } from "@/lib/api/respond";
import { downloadFromBackend } from "@/lib/backend/download";
import { isUuid } from "@/lib/shape";
import { attachmentHeaders } from "@/lib/support/download";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/support/tickets/[id]/messages/[messageId]/attachment">,
): Promise<Response> {
  const { id, messageId } = await params;
  return withStaff("support.view", async ({ token }) => {
    if (!isUuid(id) || !isUuid(messageId)) {
      return errorResponse({ code: "not_found", message: "Attachment not found" });
    }
    const result = await downloadFromBackend(`/v1/admin/support/tickets/${id}/messages/${messageId}/attachment`, {
      token,
      accept: "*/*",
    });
    if (!result.ok) return errorResponse(result.error, result.status);
    return new Response(result.body, { status: 200, headers: attachmentHeaders(result.headers) });
  });
}
