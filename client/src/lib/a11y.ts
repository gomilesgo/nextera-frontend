export function describedBy(name: string, invalid?: boolean, hint?: boolean): string | undefined {
  const ids = [hint ? `${name}-hint` : null, invalid ? `${name}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

export function firstInvalid<T extends string>(order: readonly T[], errors: Partial<Record<T, string>>): T | null {
  return order.find((field) => Boolean(errors[field])) ?? null;
}
