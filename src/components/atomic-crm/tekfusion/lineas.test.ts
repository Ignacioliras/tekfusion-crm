import { describe, expect, it } from "vitest";

import { detectarLineaPorPalabras } from "./lineas";

describe("detectarLineaPorPalabras", () => {
  it("detects valves ignoring accents and case", () => {
    expect(
      detectarLineaPorPalabras("Busco VÁLVULAS de bola de 2 pulgadas inox"),
    ).toBe("valvulas");
  });

  it("detects pipes from 'cañería' with ñ", () => {
    expect(detectarLineaPorPalabras("Necesito cotizar cañerías de cobre")).toBe(
      "tuberias",
    );
  });

  it("detects geocells from plural keyword", () => {
    expect(
      detectarLineaPorPalabras("Cotización geoceldas para estabilizar talud"),
    ).toBe("geoceldas");
  });

  it("returns indeterminada when no keyword appears", () => {
    expect(
      detectarLineaPorPalabras("Hola, quiero información de sus productos"),
    ).toBe("indeterminada");
  });

  it("does not match a keyword inside another word", () => {
    expect(detectarLineaPorPalabras("Agendemos una reunión el martes")).toBe(
      "indeterminada",
    );
  });
});
