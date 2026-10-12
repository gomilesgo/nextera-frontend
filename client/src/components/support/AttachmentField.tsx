"use client";

import { useId, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { formatBytes } from "@/lib/support/copy";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_FIELD,
  SUPPORT_ATTACHMENT_MAX_LABEL,
  checkAttachment,
} from "@/lib/support/validation";

export function AttachmentField({
  error,
  disabled,
  onChange,
}: {
  error?: string;
  disabled?: boolean;
  onChange?: () => void;
}) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<{ name: string; size: number } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const shown = localError ?? error;

  function choose(files: FileList | null) {
    const file = files?.[0];
    onChange?.();
    if (!file) {
      setSelected(null);
      setLocalError(null);
      return;
    }
    setSelected({ name: file.name, size: file.size });
    setLocalError(checkAttachment(file));
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setSelected(null);
    setLocalError(null);
    onChange?.();
    inputRef.current?.focus();
  }

  return (
    <div className="grid content-start gap-2">
      <label htmlFor={inputId} className="label">
        Attachment
        <span className="ml-2 normal-case tracking-normal text-dust/70">(optional)</span>
      </label>
      <div
        className={cx(
          "flex flex-col gap-3 rounded-[2px] border border-dashed px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
          shown ? "border-ember/60" : "border-parchment/20",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          name={SUPPORT_ATTACHMENT_FIELD}
          type="file"
          accept={SUPPORT_ATTACHMENT_ACCEPT}
          disabled={disabled}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? `${errorId} ${hintId}` : hintId}
          onChange={(event) => choose(event.currentTarget.files)}
          className="min-w-0 text-sm text-parchment/80 file:mr-4 file:min-h-10 file:cursor-pointer file:rounded-full file:border file:border-parchment/25 file:bg-transparent file:px-4 file:text-xs file:font-medium file:text-parchment hover:file:border-lagoon hover:file:text-lagoon disabled:opacity-60"
        />
        {selected ? (
          <div className="flex items-center gap-3 text-xs text-dust">
            <span className="tnum">{formatBytes(selected.size)}</span>
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              className="min-h-9 rounded-full px-3 text-parchment/80 underline-offset-4 hover:text-lagoon hover:underline focus-visible:outline-2"
            >
              Remove<span className="sr-only"> {selected.name}</span>
            </button>
          </div>
        ) : null}
      </div>
      {shown ? (
        <p id={errorId} className="text-sm text-ember">
          {shown}
        </p>
      ) : null}
      <p id={hintId} className="text-xs text-dust">
        One PDF, JPEG, PNG or WebP file, up to {SUPPORT_ATTACHMENT_MAX_LABEL}. Please do not send passwords or card numbers.
      </p>
    </div>
  );
}
