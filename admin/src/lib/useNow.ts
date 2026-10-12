"use client";

import { useEffect, useState } from "react";

export function useNow(initial: number, intervalMs = 60_000): number {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
