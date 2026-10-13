"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * One scroll engine for every act on the page.
 *
 * Each act used to own a scroll listener and a rAF, so a frame interleaved
 * "read a rect, write a custom property" once per act and forced the browser to
 * re-run layout between each pair. This reads every act's geometry first, then
 * writes, so a frame costs one layout at most. Acts whose progress has not
 * moved are skipped entirely, which is most acts on most frames.
 */
type Entry = {
  node: HTMLElement;
  onFrame?: (progress: number) => void;
  last: string;
};

const entries = new Set<Entry>();
let frame = 0;
let listening = false;

function measure() {
  frame = 0;
  const viewport = window.innerHeight;

  // Read phase. Nothing here may write to the DOM.
  const pending: { entry: Entry; progress: number }[] = [];
  for (const entry of entries) {
    const span = entry.node.offsetHeight - viewport;
    const top = entry.node.getBoundingClientRect().top;
    const progress = span <= 0 ? 1 : Math.min(1, Math.max(0, -top / span));
    pending.push({ entry, progress });
  }

  // Write phase. Callbacks must not read layout; they cache their own geometry.
  for (const { entry, progress } of pending) {
    const text = progress.toFixed(4);
    if (text === entry.last) continue;
    entry.last = text;
    entry.node.style.setProperty("--p", text);
    entry.onFrame?.(progress);
  }
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(measure);
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}

function stopListening() {
  if (!listening || entries.size > 0) return;
  listening = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

export function useScrollVar(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onFrame?: (progress: number) => void,
) {
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!enabled) {
      node.style.setProperty("--p", "1");
      onFrameRef.current?.(1);
      return;
    }

    const entry: Entry = {
      node,
      onFrame: (progress) => onFrameRef.current?.(progress),
      last: "",
    };
    entries.add(entry);
    listen();
    schedule();

    return () => {
      entries.delete(entry);
      stopListening();
    };
  }, [ref, enabled]);
}
