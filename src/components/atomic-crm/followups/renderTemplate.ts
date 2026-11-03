// Variables a follow-up template may use (templates_known_variables in the base).
export interface TemplateVariables {
  nombre?: string | null;
  empresa?: string | null;
  producto?: string | null;
  ejecutivo?: string | null;
}

/**
 * Resolves {{nombre}}, {{empresa}}, {{producto}} and {{ejecutivo}} for the
 * preview. A value we do not know stays as its placeholder, so the executive
 * sees what is missing instead of a silent blank. Plain text only: the result
 * is rendered as text, never as HTML.
 */
export const renderTemplate = (
  text: string | null | undefined,
  variables: TemplateVariables,
): string =>
  (text ?? "").replace(
    /\{\{(nombre|empresa|producto|ejecutivo)\}\}/g,
    (placeholder, name: keyof TemplateVariables) =>
      variables[name]?.trim() || placeholder,
  );
