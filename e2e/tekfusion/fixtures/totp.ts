import { createHmac } from "node:crypto";

// TOTP de RFC 6238 (HMAC-SHA1, paso 30 s, secreto base32) para los e2e: otplib
// no está instalado y no hace falta para esto.
export const TOTP_STEP_SECONDS = 30;

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Decode = (secret: string): Buffer => {
  const clean = secret.replace(/[\s=]/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const value = BASE32.indexOf(char);
    if (value < 0) throw new Error(`totp: carácter base32 inválido "${char}"`);
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((byte) => parseInt(byte, 2)));
};

/** Número de paso de 30 s para un instante en ms. */
export const totpStep = (timeMs: number = Date.now()): number =>
  Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS);

export const totp = (
  secret: string,
  timeMs: number = Date.now(),
  digits = 6,
): string => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(totpStep(timeMs)));
  const hmac = createHmac("sha1", base32Decode(secret))
    .update(counter)
    .digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, "0");
};

// Vector de prueba del RFC 6238 (SHA1, secreto "12345678901234567890", T=59 s
// → 94287082): si el generador se rompe, el spec falla al cargar.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
for (const [timeMs, expected] of [
  [59_000, "94287082"],
  [1_111_111_109_000, "07081804"],
  [20_000_000_000_000, "65353130"],
] as const) {
  const actual = totp(RFC_SECRET, timeMs, 8);
  if (actual !== expected) {
    throw new Error(
      `totp: vector RFC 6238 en t=${timeMs} dio ${actual}, se esperaba ${expected}`,
    );
  }
}
