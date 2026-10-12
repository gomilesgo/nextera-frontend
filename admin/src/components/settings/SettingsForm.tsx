"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatBps, formatPaise } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { actionErrorMessage, fieldErrors } from "@/lib/actions/outcome";
import type { FieldErrors } from "@/lib/actions/outcome";
import { settingsQueries } from "@/lib/queries/options";
import { NO_CHANGES, buildSettingsUpdate, readSettingsForm, settingsToValues } from "@/lib/settings/form";
import { useUpdateSettings } from "@/lib/settings/mutations";

export function SettingsForm() {
  const { data, error, isPending } = useQuery(settingsQueries.current());
  const save = useUpdateSettings();
  const [pending, setPending] = useState<FormData | null>(null);
  const [local, setLocal] = useState<{ errors: FieldErrors } | { unchanged: true } | null>(null);
  const errors = local && "errors" in local ? local.errors : fieldErrors(save.error);
  const message = actionErrorMessage(save.error);
  const unchanged = (local !== null && "unchanged" in local) || save.data?.changed === false;

  if (isPending) return <p className="text-sm text-dust">Loading settings…</p>;
  if (!data) return <Notice tone="error">{error?.message ?? "Settings are unavailable"}</Notice>;

  const { settings } = data;
  const values = settingsToValues(settings);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.reset();
    const formData = new FormData(event.currentTarget);
    const built = buildSettingsUpdate(readSettingsForm(formData), settings);
    if (built.status === "invalid") {
      setLocal({ errors: built.errors });
      return;
    }
    if (built.status === "unchanged") {
      setLocal({ unchanged: true });
      return;
    }
    setLocal(null);
    setPending(formData);
  }

  function confirm() {
    if (!pending) return;
    save.mutate(pending, { onSettled: () => setPending(null) });
  }

  return (
    <>
      <form
        key={`${settings.tdsRateBps}:${settings.minWithdrawalPaise}`}
        onSubmit={onSubmit}
        noValidate
        className="hairline grid max-w-2xl gap-5 rounded-[3px] bg-horizon/40 p-5"
      >
        {unchanged ? <Notice>{NO_CHANGES}.</Notice> : null}
        {save.isSuccess && save.data.changed ? <Notice tone="success">Settings saved.</Notice> : null}
        {message ? <Notice tone="error">{message}</Notice> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="tdsRate"
            label="TDS rate (%)"
            error={errors.tdsRate}
            hint={`Deducted from each monthly return. Currently ${formatBps(settings.tdsRateBps)}, at most 50%.`}
          >
            <TextInput
              name="tdsRate"
              inputMode="decimal"
              defaultValue={values.tdsRate}
              required
              className="text-right"
              invalid={Boolean(errors.tdsRate)}
            />
          </Field>
          <Field
            name="minWithdrawal"
            label="Minimum withdrawal (₹)"
            error={errors.minWithdrawal}
            hint={`Smallest amount a customer can withdraw. Currently ${formatPaise(settings.minWithdrawalPaise)}, at least ₹1.`}
          >
            <TextInput
              name="minWithdrawal"
              inputMode="decimal"
              defaultValue={values.minWithdrawal}
              required
              className="text-right"
              invalid={Boolean(errors.minWithdrawal)}
            />
          </Field>
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        title="Save these settings?"
        description="New values apply to future accruals and withdrawal requests. The change is audited."
        confirmLabel="Save settings"
        pendingLabel="Saving…"
        pending={save.isPending}
      />
    </>
  );
}
