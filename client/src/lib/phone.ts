const INDIAN_MOBILE = /^(?:\+?91|0)?([6-9]\d{9})$/;

export function normalizeIndianMobile(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, "");
  const match = INDIAN_MOBILE.exec(compact);
  return match ? `+91${match[1]}` : null;
}

export function formatIndianMobile(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

export function maskIndianMobile(e164: string): string {
  const match = /^\+91(\d{2})\d{6}(\d{2})$/.exec(e164);
  return match ? `+91 ${match[1]}•••• ••${match[2]}` : e164;
}
