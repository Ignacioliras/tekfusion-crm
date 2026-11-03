import { describe, it, expect } from "vitest";
import { parseLeadClassification } from "./leadClassification";

const validOutput = {
  linea: "tuberias",
  confianza: 0.95,
  empresa: "Constructora Ficticia SpA",
  nombre: "Juana Pérez",
  correo: "juana.perez@ejemplo.cl",
  telefono: "+56912345678",
  necesidad: "300 m de tubería HDPE 110 mm PN10 para Rancagua",
  es_spam: false,
};

const withFields = (fields: Record<string, unknown>) =>
  JSON.stringify({ ...validOutput, ...fields });

describe("parseLeadClassification", () => {
  it("returns the classification when the output is valid", () => {
    expect(parseLeadClassification(JSON.stringify(validOutput))).toEqual(
      validOutput,
    );
  });

  it("extracts the JSON object when the model adds text around it", () => {
    const text = `Aquí está la clasificación:\n${JSON.stringify(validOutput)}\nSaludos {fin}`;
    expect(parseLeadClassification(text)).toEqual(validOutput);
  });

  it("handles braces inside string values", () => {
    const result = parseLeadClassification(
      withFields({ necesidad: "tubería PVC {urgente}" }),
    );
    expect(result.error).toBeUndefined();
    expect(result.necesidad).toBe("tubería PVC {urgente}");
  });

  it("falls back to indeterminada when the JSON is invalid", () => {
    const result = parseLeadClassification(
      '{"linea": "valvulas", confianza: }',
    );
    expect(result).toMatchObject({
      linea: "indeterminada",
      confianza: 0,
      empresa: null,
      necesidad: "",
      es_spam: false,
    });
    expect(result.error).toMatch(/JSON inválido/);
  });

  it("falls back when there is no JSON object at all", () => {
    const result = parseLeadClassification("No puedo clasificar esto.");
    expect(result.linea).toBe("indeterminada");
    expect(result.error).toMatch(/no se encontró/);
  });

  it("falls back when confianza is out of range", () => {
    const result = parseLeadClassification(withFields({ confianza: 1.5 }));
    expect(result.linea).toBe("indeterminada");
    expect(result.confianza).toBe(0);
    expect(result.error).toMatch(/confianza/);
  });

  it("falls back when necesidad exceeds 200 characters", () => {
    const result = parseLeadClassification(
      withFields({ necesidad: "a".repeat(201) }),
    );
    expect(result.error).toMatch(/necesidad/);
  });

  it("falls back when a contact field has the wrong type", () => {
    const result = parseLeadClassification(withFields({ correo: 42 }));
    expect(result.error).toMatch(/correo/);
  });

  it("falls back when linea is unknown", () => {
    const result = parseLeadClassification(withFields({ linea: "bombas" }));
    expect(result.linea).toBe("indeterminada");
    expect(result.error).toMatch(/linea desconocida: bombas/);
  });

  it("keeps es_spam true for spam outputs", () => {
    const spam = {
      ...validOutput,
      linea: "indeterminada",
      confianza: 0.1,
      empresa: null,
      nombre: null,
      telefono: null,
      necesidad: "Oferta de hosting",
      es_spam: true,
    };
    expect(parseLeadClassification(JSON.stringify(spam))).toEqual(spam);
  });

  it("caps confianza at 0.6 when necesidad mentions more than one line", () => {
    const result = parseLeadClassification(
      withFields({
        linea: "valvulas",
        confianza: 0.9,
        necesidad: "Válvulas de bola 2 pulgadas y 100 m de cañería PVC",
      }),
    );
    expect(result.linea).toBe("valvulas");
    expect(result.confianza).toBe(0.6);
    expect(result.error).toBeUndefined();
  });

  it("does not raise confianza when it is already at or below 0.6", () => {
    const result = parseLeadClassification(
      withFields({
        confianza: 0.4,
        necesidad: "Geomembrana y tubería HDPE",
      }),
    );
    expect(result.confianza).toBe(0.4);
  });

  it("keeps a phone number that could not be normalized as is", () => {
    const result = parseLeadClassification(
      withFields({ telefono: "fono oficina 2 2345 6789 anexo 12" }),
    );
    expect(result.error).toBeUndefined();
    expect(result.telefono).toBe("fono oficina 2 2345 6789 anexo 12");
  });
});
