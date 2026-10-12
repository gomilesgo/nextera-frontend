import "server-only";
import type { Permission } from "@/lib/permissions";
import { getStaffSession } from "@/lib/session";
import type { SignedIn } from "@/lib/session";
import { sessionFailure } from "./respond";

export async function withStaff(
  permission: Permission | null,
  load: (signedIn: SignedIn) => Promise<Response>,
): Promise<Response> {
  const session = await getStaffSession();
  const failure = sessionFailure(session, permission);
  if (failure || session.status !== "signed_in") return failure ?? new Response(null, { status: 401 });
  return load({ staff: session.staff, token: session.token });
}
