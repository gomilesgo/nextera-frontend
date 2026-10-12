"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { auditActorTypes, dateRangeIsOrdered } from "@nextera/contracts";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { parseAuditFilters } from "@/lib/audit/filters";
import type { AuditFilters } from "@/lib/audit/filters";
import { auditActorLabels, knownAuditActions, knownAuditEntities } from "@/lib/audit/labels";
import type { FieldErrors } from "@/lib/actions/outcome";
import { isUuid } from "@/lib/shape";

function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function AuditFiltersForm({
  filters,
  onApply,
  onClear,
}: {
  filters: AuditFilters;
  onApply: (filters: AuditFilters) => void;
  onClear: () => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = {
      actorType: read(data, "actorType"),
      actorId: read(data, "actorId"),
      action: read(data, "action"),
      entity: read(data, "entity"),
      entityId: read(data, "entityId"),
      from: read(data, "from"),
      to: read(data, "to"),
      limit: String(filters.limit),
    };
    const next: FieldErrors = {};
    if (values.actorId && !isUuid(values.actorId)) next.actorId = ["Enter the actor's full ID"];
    if (!dateRangeIsOrdered(values.from || undefined, values.to || undefined)) {
      next.to = ["The end date must not be before the start date"];
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onApply(parseAuditFilters(values));
  }

  return (
    <form
      role="search"
      aria-label="Filter the audit log"
      onSubmit={onSubmit}
      noValidate
      className="hairline grid gap-3 rounded-[3px] bg-horizon/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Field name="actorType" label="Actor type">
        <SelectInput name="actorType" defaultValue={filters.actorType ?? ""}>
          <option value="">Anyone</option>
          {auditActorTypes.map((type) => (
            <option key={type} value={type}>
              {auditActorLabels[type]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field name="actorId" label="Actor ID" error={errors.actorId}>
        <TextInput
          name="actorId"
          defaultValue={filters.actorId ?? ""}
          placeholder="Staff or customer UUID"
          className="font-mono"
          spellCheck={false}
          invalid={Boolean(errors.actorId)}
        />
      </Field>
      <Field name="action" label="Action">
        <TextInput
          name="action"
          defaultValue={filters.action ?? ""}
          list="audit-actions"
          placeholder="e.g. customer.block"
          className="font-mono"
          spellCheck={false}
          maxLength={100}
        />
        <datalist id="audit-actions">
          {knownAuditActions.map((action) => (
            <option key={action} value={action} />
          ))}
        </datalist>
      </Field>
      <Field name="entity" label="Entity">
        <TextInput
          name="entity"
          defaultValue={filters.entity ?? ""}
          list="audit-entities"
          placeholder="e.g. customer"
          className="font-mono"
          spellCheck={false}
          maxLength={100}
        />
        <datalist id="audit-entities">
          {knownAuditEntities.map((entity) => (
            <option key={entity} value={entity} />
          ))}
        </datalist>
      </Field>
      <Field name="entityId" label="Entity ID">
        <TextInput name="entityId" defaultValue={filters.entityId ?? ""} className="font-mono" spellCheck={false} maxLength={200} />
      </Field>
      <Field name="from" label="From">
        <TextInput name="from" type="date" defaultValue={filters.from ?? ""} />
      </Field>
      <Field name="to" label="To" error={errors.to}>
        <TextInput name="to" type="date" defaultValue={filters.to ?? ""} invalid={Boolean(errors.to)} />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit">Apply</Button>
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </form>
  );
}
