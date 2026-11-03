import { renderTemplate } from "./renderTemplate";

describe("renderTemplate", () => {
  it("fills the four known variables", () => {
    expect(
      renderTemplate(
        "Hola {{nombre}} de {{empresa}}: {{producto}}. {{ejecutivo}}",
        {
          nombre: "Paula",
          empresa: "Minera Los Andes",
          producto: "Válvulas mariposa",
          ejecutivo: "— Camila Rojas, TekFusion",
        },
      ),
    ).toBe(
      "Hola Paula de Minera Los Andes: Válvulas mariposa. — Camila Rojas, TekFusion",
    );
  });

  it("keeps the placeholder of a value it does not know", () => {
    expect(renderTemplate("Hola {{nombre}}", { nombre: "  " })).toBe(
      "Hola {{nombre}}",
    );
  });

  it("leaves text and markup untouched (rendered as plain text)", () => {
    expect(renderTemplate("<b>{{nombre}}</b>", { nombre: "<script>" })).toBe(
      "<b><script></b>",
    );
  });
});
