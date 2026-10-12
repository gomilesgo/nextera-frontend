"use client";

import { useSyncExternalStore } from "react";

export type Deadline = { endsAt: number; seconds: number };

let current = 0;
let timer: number | null = null;
const listeners = new Set<() => void>();

function notify() {
  current = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) timer = window.setInterval(notify, 1000);
  queueMicrotask(notify);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

function idle(): () => void {
  return () => {};
}

function snapshot(): number {
  return current;
}

export function deadlineIn(seconds: number): Deadline {
  return { endsAt: Date.now() + seconds * 1000, seconds };
}

export function remainingSeconds(deadline: Deadline | null, nowMs: number): number {
  if (!deadline) return 0;
  return Math.max(0, Math.min(deadline.seconds, Math.ceil((deadline.endsAt - nowMs) / 1000)));
}

export function useSecondsUntil(deadline: Deadline | null): number {
  const active = remainingSeconds(deadline, snapshot()) > 0;
  const now = useSyncExternalStore(active ? subscribe : idle, snapshot, snapshot);
  return remainingSeconds(deadline, now);
}

export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}
