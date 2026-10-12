import { withStaff } from "@/lib/api/handler";
import { errorResponse } from "@/lib/api/respond";
import { fetchInvestmentDocument, pdfInline } from "@/lib/investments/document";
import { documentLoginPath, documentReturnPath } from "@/lib/investments/documentLinks";
import { PASSWORD_PATH } from "@/lib/sessionCookie";

function redirectTo(location: string): Response {
  return new Response(null, { status: 307, headers: { location, "cache-control": "no-store" } });
}

async function errorCode(response: Response): Promise<string | null> {
  try {
    const body = (await response.clone().json()) as { error?: { code?: unknown } };
    return typeof body.error?.code === "string" ? body.error.code : null;
  } catch {
    return null;
  }
}

async function forBrowser(response: Response, returnPath: string): Promise<Response> {
  if (response.status === 401) return redirectTo(documentLoginPath(returnPath, true));
  if (response.status === 403 && (await errorCode(response)) === "password_change_required") return redirectTo(PASSWORD_PATH);
  return response;
}

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/investments/[id]/documents/[documentId]">,
): Promise<Response> {
  const { id, documentId } = await params;
  const returnPath = documentReturnPath(new URL(request.url).pathname) ?? "/investments";
  const response = await withStaff("investments.view", async ({ token }) => {
    const file = await fetchInvestmentDocument(token, id, documentId);
    if (!file.ok) return errorResponse(file.error, file.status);
    return pdfInline(file);
  });
  return forBrowser(response, returnPath);
}
