import { attachmentHandler } from "@/lib/api/supportHandlers";
import { callBackend } from "@/lib/backend/server";
import { readSessionToken } from "@/lib/session";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/support/tickets/[id]/messages/[messageId]/attachment">,
) {
  const { id, messageId } = await ctx.params;
  return attachmentHandler({ token: await readSessionToken(), call: callBackend }, id, messageId);
}
