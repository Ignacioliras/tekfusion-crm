import { render } from "vitest-browser-react";
import { page } from "vitest/browser";
import { createDataProvider } from "@/components/atomic-crm/providers/fakerest";
import type { Db } from "@/components/atomic-crm/providers/fakerest/dataGenerator/types";
import { buildSale, createCrmDb, StoryWrapper } from "@/test/StoryWrapper";

import { SettingsPage } from "./SettingsPage";

// Fictitious catalog data; management (canAccess true) unless stated. The
// catalogs live on the settings page and, like everything there, are saved by
// its one fixed button ("Save": the test i18n is English for Atomic's keys).
const setup = (data: Partial<Db> = {}) =>
  createDataProvider({ db: createCrmDb(data), latency: 0, silent: true });

const all = async (
  dataProvider: ReturnType<typeof setup>,
  resource: string,
  field = "id",
) =>
  (
    await dataProvider.getList(resource, {
      filter: {},
      pagination: { page: 1, perPage: 100 },
      sort: { field, order: "ASC" },
    })
  ).data;

const renderSettings = async (dataProvider: ReturnType<typeof setup>) => {
  const screen = await render(
    <StoryWrapper dataProvider={dataProvider}>
      <SettingsPage />
    </StoryWrapper>,
  );
  const saveButton = screen.getByRole("button", { name: "Save", exact: true });
  return {
    screen,
    region: (name: string) => screen.getByRole("region", { name }),
    save: () => saveButton.click(),
  };
};

describe("Configuración: plantillas, respuestas rápidas, motivos y firmas", () => {
  beforeAll(() => {
    page.viewport(1400, 1000);
  });

  it("management creates a valid template, sees the preview, and the page saves it", async () => {
    const dataProvider = setup();
    const { region, save } = await renderSettings(dataProvider);
    const templates = region("Plantillas de seguimiento");

    await templates.getByRole("button", { name: "Agregar" }).click();
    await templates.getByLabelText("Nombre").fill("Primer seguimiento");
    await templates
      .getByLabelText("Asunto")
      .fill("Cotización para {{empresa}}");
    await templates
      .getByLabelText("Mensaje")
      .fill("Hola {{nombre}}, soy {{ejecutivo}}. ¿Revisaste la {{producto}}?");

    const preview = templates.getByRole("region", { name: "Vista previa" });
    await expect
      .element(preview.getByText("Cotización para Constructora Ejemplo SpA"))
      .toBeVisible();
    await expect
      .element(
        preview.getByText(
          "Hola Juan Pérez, soy María Soto. ¿Revisaste la válvula de bola 2”?",
        ),
      )
      .toBeVisible();

    await templates.getByRole("button", { name: "Aplicar" }).click();
    await expect
      .element(templates.getByText(/^Primer seguimiento · Correo/))
      .toBeVisible();
    // Applied, not saved yet: the page's button saves it.
    expect(await all(dataProvider, "templates")).toHaveLength(0);

    await save();
    await expect
      .poll(() => all(dataProvider, "templates"))
      .toMatchObject([
        {
          name: "Primer seguimiento",
          channel: "correo",
          subject: "Cotización para {{empresa}}",
          active: true,
        },
      ]);
  });

  it("rejects a template with an unknown variable", async () => {
    const { region } = await renderSettings(setup());
    const templates = region("Plantillas de seguimiento");

    await templates.getByRole("button", { name: "Agregar" }).click();
    await templates.getByLabelText("Nombre").fill("Recordatorio");
    await templates.getByLabelText("Canal").selectOptions("whatsapp");
    await templates.getByLabelText("Mensaje").fill("Hola {{cliente}}");
    await templates.getByRole("button", { name: "Aplicar" }).click();

    await expect
      .element(templates.getByText("Variables no permitidas: {{cliente}}"))
      .toBeVisible();
  });

  it("creates and deactivates a quick reply; the page saves both", async () => {
    const dataProvider = setup();
    const { region, save } = await renderSettings(dataProvider);
    const replies = region("Respuestas rápidas de WhatsApp");

    await replies.getByRole("button", { name: "Agregar" }).click();
    await replies.getByLabelText("Título").fill("Horario");
    await replies
      .getByLabelText("Texto")
      .fill("Atendemos de lunes a viernes de 9:00 a 18:00.");
    await replies.getByRole("button", { name: "Aplicar" }).click();
    await replies.getByRole("button", { name: "Desactivar Horario" }).click();
    await expect.element(replies.getByText(/Inactiva/)).toBeVisible();

    await save();
    await expect
      .poll(() => all(dataProvider, "quick_replies"))
      .toMatchObject([{ title: "Horario", active: false }]);
  });

  it("moves a lost reason down and the page saves the new order", async () => {
    const dataProvider = setup({
      lost_reasons: [
        { id: 1, name: "Precio", active: true, position: 0 },
        { id: 2, name: "Plazo de entrega", active: true, position: 1 },
        { id: 3, name: "Sin stock", active: true, position: 2 },
      ],
    });
    const { region, save } = await renderSettings(dataProvider);
    const reasons = region("Motivos de pérdida");

    await reasons.getByRole("button", { name: "Bajar Precio" }).click();
    await expect
      .element(
        reasons.getByRole("listitem").first().getByText("Plazo de entrega"),
      )
      .toBeVisible();

    await save();
    await expect
      .poll(async () =>
        (await all(dataProvider, "lost_reasons", "position")).map(
          (reason) => reason.name,
        ),
      )
      .toEqual(["Plazo de entrega", "Precio", "Sin stock"]);
  });

  it("management edits an executive's signature", async () => {
    const dataProvider = setup({
      sales: [
        buildSale(),
        buildSale({
          id: 2,
          user_id: "2",
          first_name: "Camila",
          last_name: "Rojas",
          email: "camila@demo.cl",
          role: "executive",
          administrator: false,
        }),
      ],
    });
    const screen = await render(
      <StoryWrapper initialEntries={["/sales/2"]} dataProvider={dataProvider}>
        {null}
      </StoryWrapper>,
    );

    await screen
      .getByLabelText("Firma")
      .fill("Camila Rojas\nEjecutiva comercial");
    await screen.getByRole("button", { name: /^save$/i }).click();

    await expect
      .poll(async () => (await dataProvider.getOne("sales", { id: 2 })).data)
      .toMatchObject({
        signature: "Camila Rojas\nEjecutiva comercial",
        first_name: "Camila",
      });
  });

  it("the side index lists every section, the TekFusion ones included", async () => {
    const { screen } = await renderSettings(setup());
    const index = screen.getByRole("navigation");

    for (const section of [
      "Seguimientos y horario hábil",
      "Facturación y reporte semanal",
      "Plantillas de seguimiento",
      "Respuestas rápidas de WhatsApp",
      "Motivos de pérdida",
    ]) {
      await expect
        .element(index.getByRole("button", { name: section }))
        .toBeVisible();
    }
  });

  it("an executive does not see the catalogs", async () => {
    const screen = await render(
      <StoryWrapper
        authProvider={{
          canAccess: async ({ resource }) => resource !== "configuration",
        }}
      >
        <SettingsPage />
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByRole("button", { name: "Save", exact: true }))
      .toBeVisible();
    for (const title of [
      "Plantillas de seguimiento",
      "Respuestas rápidas de WhatsApp",
      "Motivos de pérdida",
    ]) {
      expect(
        screen.getByRole("region", { name: title }).elements(),
      ).toHaveLength(0);
    }
  });
});
