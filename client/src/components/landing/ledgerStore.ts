"use client";

/**
 * The page's running state, read by the instrument bar. Kept outside React so
 * a scroll frame in one act can update the fixed bar without re-rendering the
 * acts between them.
 */
export type LedgerState = {
  /** Credits that have landed in the year-run act. */
  credits: number;
  /** True once the principal has been returned. */
  matured: boolean;
  /** Id of the act currently holding the viewport. */
  act: string;
};

let state: LedgerState = { credits: 0, matured: false, act: "" };
const listeners = new Set<() => void>();

const server: LedgerState = state;

export function getLedger(): LedgerState {
  return state;
}

export function getServerLedger(): LedgerState {
  return server;
}

export function subscribeLedger(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLedger(next: Partial<LedgerState>): void {
  const merged = { ...state, ...next };
  if (merged.credits === state.credits && merged.matured === state.matured && merged.act === state.act) return;
  state = merged;
  for (const listener of listeners) listener();
}
