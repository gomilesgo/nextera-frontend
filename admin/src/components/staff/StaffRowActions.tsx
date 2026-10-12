"use client";

import { useState } from "react";
import { staffRoles } from "@nextera/contracts";
import type { StaffMember, StaffRole } from "@nextera/contracts";
import { CredentialsReveal } from "@/components/staff/CredentialsReveal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Field, SelectInput } from "@/components/ui/Field";
import { actionErrorMessage } from "@/lib/actions/outcome";
import { roleLabels } from "@/lib/staff";
import { memberActions } from "@/lib/team/labels";
import { useChangeStaffRole, useResetCredentials, useStaffAccess } from "@/lib/team/mutations";

type Open = "role" | "access" | "reset" | "revealed" | null;

export function StaffRowActions({ member, viewerId }: { member: StaffMember; viewerId: string }) {
  const allowed = memberActions(member, viewerId);
  const role = useChangeStaffRole(member.id);
  const access = useStaffAccess(member.id);
  const reset = useResetCredentials(member.id);
  const [open, setOpen] = useState<Open>(null);
  const [nextRole, setNextRole] = useState<StaffRole>(member.role);
  const disabled = member.disabledAt !== null;

  function show(next: Open) {
    role.reset();
    access.reset();
    reset.reset();
    setNextRole(member.role);
    setOpen(next);
  }

  function finishReveal() {
    reset.reset();
    setOpen(null);
  }

  if (allowed.self) return <span className="text-xs text-dust">Your account</span>;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {allowed.changeRole ? (
        <Button size="sm" variant="secondary" onClick={() => show("role")} aria-label={`Change role for ${member.name}`}>
          Role
        </Button>
      ) : null}
      {allowed.toggleAccess ? (
        <Button
          size="sm"
          variant={disabled ? "secondary" : "danger"}
          onClick={() => show("access")}
          aria-label={`${disabled ? "Enable" : "Disable"} ${member.name}`}
        >
          {disabled ? "Enable" : "Disable"}
        </Button>
      ) : null}
      {allowed.resetCredentials ? (
        <Button size="sm" variant="secondary" onClick={() => show("reset")} aria-label={`Reset credentials for ${member.name}`}>
          Reset
        </Button>
      ) : null}

      <ConfirmDialog
        open={open === "role"}
        onClose={() => setOpen(null)}
        onConfirm={() =>
          nextRole === member.role ? setOpen(null) : role.mutate(nextRole, { onSuccess: () => setOpen(null) })
        }
        title={`Change ${member.name}'s role`}
        description="The change applies to their next request. At least one active owner must remain."
        confirmLabel="Change role"
        pendingLabel="Saving…"
        pending={role.isPending}
        error={actionErrorMessage(role.error)}
      >
        <Field
          name={`role-${member.id}`}
          label="Role"
          hint={nextRole === "owner" ? "Owners can manage staff and settings." : undefined}
        >
          <SelectInput
            name={`role-${member.id}`}
            value={nextRole}
            onChange={(event) => setNextRole(event.target.value as StaffRole)}
          >
            {staffRoles.map((option) => (
              <option key={option} value={option}>
                {roleLabels[option]}
              </option>
            ))}
          </SelectInput>
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "access"}
        onClose={() => setOpen(null)}
        onConfirm={() => access.mutate(!disabled, { onSuccess: () => setOpen(null) })}
        title={disabled ? `Enable ${member.name}?` : `Disable ${member.name}?`}
        description={
          disabled
            ? "They can sign in again with their existing password and authenticator."
            : "They are signed out everywhere and cannot sign in until re-enabled."
        }
        confirmLabel={disabled ? "Enable" : "Disable"}
        pendingLabel="Saving…"
        tone={disabled ? "primary" : "danger"}
        pending={access.isPending}
        error={actionErrorMessage(access.error)}
      />

      <ConfirmDialog
        open={open === "reset"}
        onClose={() => setOpen(null)}
        onConfirm={() => reset.mutate(undefined, { onSuccess: () => setOpen("revealed") })}
        title={`Reset ${member.name}'s credentials?`}
        description="Their password and authenticator are replaced and they are signed out everywhere. You will see the new credentials once."
        confirmLabel="Reset credentials"
        pendingLabel="Resetting…"
        tone="danger"
        pending={reset.isPending}
        error={actionErrorMessage(reset.error)}
      />

      <Dialog
        open={open === "revealed" && Boolean(reset.data)}
        onClose={finishReveal}
        dismissible={false}
        title="Share the new credentials"
        className="w-[min(36rem,calc(100vw-2rem))]"
      >
        {reset.data ? <CredentialsReveal credentials={reset.data} purpose="reset" onDone={finishReveal} /> : null}
      </Dialog>
    </div>
  );
}
