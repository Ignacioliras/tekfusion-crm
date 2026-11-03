// Business lines of TekFusion. Keywords mirror n8n/prompts/clasificar-lead.md,
// stored lowercase and without accents; they match as word prefixes (plurals included).

export const LINEA_INDETERMINADA = "indeterminada" as const;

export const LINEAS_NEGOCIO = [
  {
    value: "valvulas",
    label: "Válvulas",
    description: "Válvulas industriales, actuadores y accesorios.",
    keywords: [
      "valvula",
      "compuerta",
      "bola",
      "mariposa",
      "check",
      "globo",
      "actuador",
    ],
  },
  {
    value: "tuberias",
    label: "Tuberías",
    description: "Tuberías y cañerías (HDPE, PVC, acero, PPR) y fittings.",
    keywords: [
      "tuberia",
      "caneria",
      "hdpe",
      "pvc",
      "acero",
      "ppr",
      "fitting",
      "codo",
      "union",
      "flange",
      "manguera",
    ],
  },
  {
    value: "geoceldas",
    label: "Geoceldas y geosintéticos",
    description:
      "Geoceldas, geosintéticos y soluciones de contención de suelos.",
    keywords: [
      "geocelda",
      "geosintetico",
      "geomembrana",
      "geotextil",
      "geomalla",
      "contencion",
      "estabiliz",
    ],
  },
  {
    value: LINEA_INDETERMINADA,
    label: "Por clasificar",
    description: "Sin señales claras de ninguna línea.",
    keywords: [],
  },
] as const;

export type LineaNegocio = (typeof LINEAS_NEGOCIO)[number]["value"];

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ponytail: keyword prefix match, line order wins; the Haiku classifier handles nuance.
export const detectarLineaPorPalabras = (texto: string): LineaNegocio => {
  const words = normalize(texto).split(/[^a-z0-9]+/);
  const match = LINEAS_NEGOCIO.find((linea) =>
    linea.keywords.some((kw) => words.some((word) => word.startsWith(kw))),
  );
  return match?.value ?? LINEA_INDETERMINADA;
};
