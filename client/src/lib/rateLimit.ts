export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type WindowEntry = {
  windowStart: number;
  count: number;
};

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): (key: string, now?: number) => RateLimitResult {
  const { limit, windowMs, maxKeys = 10000 } = options;
  const store = new Map<string, WindowEntry>();

  return function check(key: string, now: number = Date.now()): RateLimitResult {
    const entry = store.get(key);
    const windowStart = entry && now - entry.windowStart < windowMs
      ? entry.windowStart
      : now;

    const isNewWindow = !entry || windowStart !== entry.windowStart;
    const count = isNewWindow ? 1 : entry.count + 1;

    if (isNewWindow && store.size >= maxKeys) {
      let oldestKey: string | undefined;
      let oldestTime = Infinity;
      for (const [k, v] of store) {
        if (v.windowStart < oldestTime) {
          oldestTime = v.windowStart;
          oldestKey = k;
        }
      }
      if (oldestKey !== undefined) {
        store.delete(oldestKey);
      }
    }

    store.set(key, { windowStart, count });

    if (count > limit) {
      const retryAfterSeconds = Math.ceil((windowStart + windowMs - now) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 0) };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  };
}
