export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Re-maps an act's 0..1 scroll progress onto the window where its content
 * actually plays, so an act can read its heading before anything moves and
 * hold its final state before the next act cuts in.
 */
export function window01(progress: number, lead: number, settle: number): number {
  if (!(settle > lead)) return clamp01(progress);
  return clamp01((clamp01(progress) - lead) / (settle - lead));
}

/**
 * How many monthly credits have landed. The last slot of the window is the
 * hold, so the twelfth credit arrives before the act stops moving rather than
 * on its final pixel.
 */
export function creditsLanded(progress: number, months: number, lead = 0.14, settle = 0.82): number {
  if (!Number.isFinite(months) || months < 1) return 0;
  const t = window01(progress, lead, settle);
  return Math.min(months, Math.floor(t * (months + 1)));
}

/** The principal is returned once the credits are done and the act has settled. */
export function maturityReached(progress: number, settle = 0.82): boolean {
  return clamp01(progress) >= settle;
}
