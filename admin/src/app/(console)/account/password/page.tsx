import type { Metadata } from "next";
import { PasswordForm } from "@/components/account/PasswordForm";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const { staff } = await requireStaff({ allowPasswordChange: true });

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Account" title="Change password" />
      {staff.mustChangePassword ? (
        <Notice>You are using a temporary password. Choose a new one to continue.</Notice>
      ) : null}
      <div className="hairline max-w-md rounded-[3px] bg-horizon/40 p-5">
        <PasswordForm />
      </div>
    </div>
  );
}
