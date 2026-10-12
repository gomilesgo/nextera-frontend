export type DiffKind = "added" | "removed" | "changed" | "unchanged";

export type DiffLine = { path: string; kind: DiffKind; before?: string; after?: string };

const MAX_DEPTH = 12;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function leafText(value: unknown): string {
  if (value === undefined) return "undefined";
  const text = JSON.stringify(value);
  return text === undefined ? String(value) : text;
}

function flatten(value: unknown, prefix: string, out: Map<string, string>, depth: number) {
  const container = Array.isArray(value) || isPlainObject(value);
  if (!container || depth >= MAX_DEPTH) {
    out.set(prefix || "(value)", leafText(value));
    return;
  }
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  if (entries.length === 0) {
    out.set(prefix || "(value)", Array.isArray(value) ? "[]" : "{}");
    return;
  }
  for (const [key, child] of entries) {
    const path = Array.isArray(value) ? `${prefix}[${key}]` : prefix ? `${prefix}.${key}` : key;
    flatten(child, path, out, depth + 1);
  }
}

function flat(value: unknown): Map<string, string> {
  const out = new Map<string, string>();
  if (value === null || value === undefined) return out;
  flatten(value, "", out, 0);
  return out;
}

export function diffJson(before: unknown, after: unknown): DiffLine[] {
  const left = flat(before);
  const right = flat(after);
  const paths = [...left.keys(), ...[...right.keys()].filter((path) => !left.has(path))];
  return paths.map((path) => {
    const was = left.get(path);
    const now = right.get(path);
    if (was === undefined) return { path, kind: "added", after: now };
    if (now === undefined) return { path, kind: "removed", before: was };
    return was === now ? { path, kind: "unchanged", before: was, after: now } : { path, kind: "changed", before: was, after: now };
  });
}

export function prettyJson(value: unknown): string {
  if (value === undefined || value === null) return "null";
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}
