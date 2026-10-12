"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { backdropDismiss, cancelBlocked, nativeClosed, syncNative } from "@/lib/dialog";

type Variant = "dialog" | "drawer";

const variants: Record<Variant, string> = {
  dialog: "m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-[3px]",
  drawer:
    "my-0 mr-0 ml-auto h-dvh max-h-dvh w-[min(44rem,100vw)] max-w-none rounded-none border-y-0 border-r-0",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  dismissible = true,
  closeButton = false,
  backdropClose = false,
  variant = "dialog",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  dismissible?: boolean;
  closeButton?: boolean;
  backdropClose?: boolean;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pressedBackdrop = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const [syncs, setSyncs] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const action = syncNative(open, dialog.open);
    if (action === "show") {
      if (!returnFocus.current && document.activeElement instanceof HTMLElement) {
        returnFocus.current = document.activeElement;
      }
      dialog.showModal();
    }
    if (action === "close") dialog.close();
    if (!open && returnFocus.current) {
      const target = returnFocus.current;
      returnFocus.current = null;
      if (target.isConnected) target.focus();
    }
  }, [open, syncs]);

  function requestClose() {
    if (dismissible) onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        if (cancelBlocked(dismissible)) event.preventDefault();
      }}
      onClose={() => {
        const next = nativeClosed(open, dismissible);
        if (next.notify) onClose();
        if (next.resync) setSyncs((count) => count + 1);
      }}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const clickedBackdrop = event.target === event.currentTarget;
        const pressed = pressedBackdrop.current;
        pressedBackdrop.current = false;
        if (backdropClose && backdropDismiss(pressed, clickedBackdrop, dismissible)) onClose();
      }}
      className={cx(
        "overflow-y-auto overscroll-contain border border-border bg-horizon p-0 text-parchment shadow-2xl backdrop:bg-inkwell/80",
        variants[variant],
        className,
      )}
    >
      {open ? (
        <div className="grid gap-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              {description ? (
                <div id={descriptionId} className="mt-1 text-sm text-dust">
                  {description}
                </div>
              ) : null}
            </div>
            {closeButton ? (
              <button
                type="button"
                onClick={requestClose}
                disabled={!dismissible}
                aria-label="Close"
                className="-m-1 rounded-[3px] p-1 text-dust outline-none hover:text-parchment focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3.5 3.5l9 9m0-9l-9 9" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
