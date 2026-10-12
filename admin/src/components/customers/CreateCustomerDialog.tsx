"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PhoneField } from "@/components/customers/PhoneField";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, TextInput } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { actionError } from "@/lib/customers/cache";
import { useCreateCustomer } from "@/lib/customers/mutations";

export function CreateCustomerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>New customer</Button>
      <CreateCustomerDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CreateCustomerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateCustomer();
  function close() {
    create.reset();
    onClose();
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!create.isPending}
      closeButton
      backdropClose
      title="New customer"
      description="The customer signs in with an OTP sent to this mobile number. KYC and bank details are added from the portal."
    >
      <CreateCustomerForm create={create} onCancel={close} />
    </Dialog>
  );
}

function CreateCustomerForm({
  create,
  onCancel,
}: {
  create: ReturnType<typeof useCreateCustomer>;
  onCancel: () => void;
}) {
  const router = useRouter();
  const failure = actionError(create.error);
  const errors = failure?.errors ?? {};
  const showNotice = failure !== null && !(failure.code === "conflict" && errors.phone);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate(new FormData(event.currentTarget), {
      onSuccess: (customer) => router.push(`/customers/${customer.id}?saved=created`),
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <div aria-live="assertive">{failure && showNotice ? <Notice tone="error">{failure.message}</Notice> : null}</div>
      <PhoneField error={errors.phone} autoFocus />
      <Field name="name" label="Full name" error={errors.name}>
        <TextInput name="name" required maxLength={100} autoComplete="off" invalid={Boolean(errors.name)} />
      </Field>
      <Field name="email" label="Email (optional)" error={errors.email}>
        <TextInput name="email" type="email" maxLength={200} autoComplete="off" invalid={Boolean(errors.email)} />
      </Field>
      {errors._ ? <Notice tone="error">{errors._.join(" ")}</Notice> : null}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending} aria-busy={create.isPending}>
          {create.isPending ? "Creating…" : "Create customer"}
        </Button>
      </div>
    </form>
  );
}
