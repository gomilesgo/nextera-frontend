function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function retryAfterPhrase(seconds: number | undefined): string | null {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return null;
  const whole = Math.ceil(seconds);
  if (whole < 90) return plural(whole, "second");
  const minutes = Math.ceil(whole / 60);
  if (minutes < 90) return `about ${plural(minutes, "minute")}`;
  return `about ${plural(Math.ceil(minutes / 60), "hour")}`;
}

export function retryAfterSentence(seconds: number | undefined): string {
  const phrase = retryAfterPhrase(seconds);
  return phrase ? `Please try again in ${phrase}.` : "Please try again shortly.";
}
