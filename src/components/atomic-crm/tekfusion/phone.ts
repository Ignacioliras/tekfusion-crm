// Phone numbers compared in E.164 (+56…), the dedupe key of docs/03.
// ponytail: Chilean rules only (9-digit mobiles/landlines, "56" prefix); a
// foreign number must come with its "+" to be read right.

const CHILE = "56";

/** E.164 form of a phone number, or undefined when it has too few digits. */
export const normalizePhone = (
  raw: string | null | undefined,
): string | undefined => {
  if (!raw) return undefined;
  const hasPlus = raw.trim().startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!hasPlus) {
    digits = digits.replace(/^0+/, "");
    if (digits.length === 9) digits = CHILE + digits;
  }
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : undefined;
};

/** Lower-cased, trimmed e-mail, or undefined when it does not look like one. */
export const normalizeEmail = (
  raw: string | null | undefined,
): string | undefined => {
  const email = raw?.trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
};
