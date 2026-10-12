const INVISIBLE = /[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/g;

export function cleanText(raw: string): string {
  return raw.normalize("NFKC").replace(INVISIBLE, "").trim();
}

export function readText(formData: FormData, name: string): string {
  const raw = formData.get(name);
  return typeof raw === "string" ? cleanText(raw) : "";
}
