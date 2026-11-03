// Validates the JSON output of the lead classifier (n8n/prompts/clasificar-lead.md).
// The model output is untrusted: never throw, fall back to "indeterminada".
import { z } from "npm:zod@^4.3.6";

export const LEAD_LINES = [
  "valvulas",
  "tuberias",
  "geoceldas",
  "indeterminada",
] as const;

const MAX_NECESIDAD_LENGTH = 200;
const MULTI_LINE_MAX_CONFIDENCE = 0.6;

const nullableString = z.string().nullable();

// Unknown keys are stripped: only these fields leave the validator.
const leadClassificationSchema = z.object({
  linea: z.enum(LEAD_LINES, {
    error: (issue) => `linea desconocida: ${String(issue.input)}`,
  }),
  confianza: z.number().min(0).max(1),
  empresa: nullableString,
  nombre: nullableString,
  correo: nullableString,
  telefono: nullableString,
  necesidad: z.string().max(MAX_NECESIDAD_LENGTH),
  es_spam: z.boolean(),
});

export type LeadLine = (typeof LEAD_LINES)[number];
export type LeadClassification = z.infer<typeof leadClassificationSchema> & {
  error?: string;
};

// Keywords from the prompt's line descriptions, without accents, lowercase.
const LINE_KEYWORDS: Record<Exclude<LeadLine, "indeterminada">, RegExp> = {
  valvulas: /\b(valvula|actuador)/,
  tuberias:
    /\b(tuberia|caneria|hdpe|pvc|ppr|fitting|codo|union|flange|manguera)/,
  geoceldas: /\b(geocelda|geosintetico|geomembrana|geotextil|geomalla)/,
};

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

/** Validates the parsed output; returns the classification or an error message. */
const validate = (value: unknown): LeadClassification | string => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "la salida no es un objeto JSON";
  }
  const result = leadClassificationSchema.safeParse(value);
  if (result.success) return result.data;
  const [issue] = result.error.issues;
  return `${issue.path.join(".")}: ${issue.message}`;
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
