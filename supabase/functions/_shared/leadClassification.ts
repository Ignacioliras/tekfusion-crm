// Validates the JSON output of the lead classifier (n8n/prompts/clasificar-lead.md).
// The model output is untrusted: never throw, fall back to "indeterminada".
// Manual validation instead of zod: the vitest "functions" project only aliases
// specific `npm:`/`jsr:` specifiers, so `npm:zod` would not resolve in tests.

export const LEAD_LINES = [
  "valvulas",
  "tuberias",
  "geoceldas",
  "indeterminada",
] as const;
export type LeadLine = (typeof LEAD_LINES)[number];

export type LeadClassification = {
  linea: LeadLine;
  confianza: number;
  empresa: string | null;
  nombre: string | null;
  correo: string | null;
  telefono: string | null;
  necesidad: string;
  es_spam: boolean;
  error?: string;
};

const MAX_NECESIDAD_LENGTH = 200;
const MULTI_LINE_MAX_CONFIDENCE = 0.6;

// Keywords from the prompt's line descriptions, without accents, lowercase.
const LINE_KEYWORDS: Record<Exclude<LeadLine, "indeterminada">, RegExp> = {
  valvulas: /\b(valvula|actuador)/,
  tuberias:
    /\b(tuberia|caneria|hdpe|pvc|ppr|fitting|codo|union|flange|manguera)/,
  geoceldas: /\b(geocelda|geosintetico|geomembrana|geotextil|geomalla)/,
};

const NULLABLE_STRING_FIELDS = [
  "empresa",
  "nombre",
  "correo",
  "telefono",
] as const;

const fallback = (error: string): LeadClassification => ({
  linea: "indeterminada",
  confianza: 0,
  empresa: null,
  nombre: null,
  correo: null,
  telefono: null,
  necesidad: "",
  es_spam: false,
  error,
});

/** Returns the first balanced `{...}` block in the text, or null. */
export const extractFirstJsonObject = (text: string): string | null => {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
};

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const countMentionedLines = (text: string): number => {
  const normalized = normalize(text);
  return Object.values(LINE_KEYWORDS).filter((re) => re.test(normalized))
    .length;
};

const validate = (value: unknown): LeadClassification | string => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "la salida no es un objeto JSON";
  }
  const data = value as Record<string, unknown>;
  if (!LEAD_LINES.includes(data.linea as LeadLine)) {
    return `linea desconocida: ${String(data.linea)}`;
  }
  const { confianza } = data;
  if (
    typeof confianza !== "number" ||
    !Number.isFinite(confianza) ||
    confianza < 0 ||
    confianza > 1
  ) {
    return "confianza debe ser un número entre 0 y 1";
  }
  for (const field of NULLABLE_STRING_FIELDS) {
    if (data[field] !== null && typeof data[field] !== "string") {
      return `${field} debe ser string o null`;
    }
  }
  if (typeof data.necesidad !== "string") return "necesidad debe ser string";
  if (data.necesidad.length > MAX_NECESIDAD_LENGTH) {
    return `necesidad supera ${MAX_NECESIDAD_LENGTH} caracteres`;
  }
  if (typeof data.es_spam !== "boolean") return "es_spam debe ser boolean";
  return {
    linea: data.linea as LeadLine,
    confianza,
    empresa: data.empresa as string | null,
    nombre: data.nombre as string | null,
    correo: data.correo as string | null,
    telefono: data.telefono as string | null,
    necesidad: data.necesidad,
    es_spam: data.es_spam,
  };
};

export const parseLeadClassification = (text: string): LeadClassification => {
  const json = extractFirstJsonObject(text);
  if (json === null) return fallback("no se encontró un objeto JSON");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return fallback(`JSON inválido: ${(e as Error).message}`);
  }
  const result = validate(parsed);
  if (typeof result === "string") return fallback(result);
  // Prompt rule 1: products of more than one line cap the confidence at 0.6.
  // Only `necesidad` is scanned: the `linea` value itself would match a keyword.
  if (
    result.confianza > MULTI_LINE_MAX_CONFIDENCE &&
    countMentionedLines(result.necesidad) > 1
  ) {
    return { ...result, confianza: MULTI_LINE_MAX_CONFIDENCE };
  }
  return result;
};
