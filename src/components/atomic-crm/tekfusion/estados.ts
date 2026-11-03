// Single source of truth for TekFusion deal stages (docs/03-reglas-negocio.md).
// `color` is a Tailwind palette name already used by Atomic (gray, yellow, orange, green, red).

export const ETAPAS = [
  { value: "nuevo", label: "Nuevo", color: "gray" },
  { value: "contactado", label: "Contactado", color: "yellow" },
  { value: "cotizado", label: "Cotizado", color: "orange" },
  { value: "ganado", label: "Ganado", color: "green" },
  { value: "perdido", label: "Perdido", color: "red" },
  { value: "archivado", label: "Archivado", color: "gray" },
] as const;

export type Etapa = (typeof ETAPAS)[number]["value"];

export const ETAPAS_ABIERTAS: readonly Etapa[] = [
  "nuevo",
  "contactado",
  "cotizado",
];

export const ETAPAS_CERRADAS: readonly Etapa[] = [
  "ganado",
  "perdido",
  "archivado",
];
