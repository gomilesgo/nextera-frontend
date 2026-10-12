export const QUEUE_PAGE_SIZE = 50;
export const QUEUE_MAX_LIMIT = 200;

export function nextLimit(limit: number): number {
  return Math.min(limit + QUEUE_PAGE_SIZE, QUEUE_MAX_LIMIT);
}

export function hasMore(count: number, limit: number): boolean {
  return count >= limit && limit < QUEUE_MAX_LIMIT;
}

export function pickStatus<T extends string>(options: readonly T[], value: string | undefined, fallback: T): T {
  return value && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}
