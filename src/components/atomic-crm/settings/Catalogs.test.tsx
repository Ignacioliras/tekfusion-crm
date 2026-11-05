import { CanAccess } from "ra-core";
import { render } from "vitest-browser-react";
import { createDataProvider } from "@/components/atomic-crm/providers/fakerest";
import type { Db } from "@/components/atomic-crm/providers/fakerest/dataGenerator/types";
import { buildSale, createCrmDb, StoryWrapper } from "@/test/StoryWrapper";

import { LostReasonsSettings } from "./LostReasonsSettings";
import { QuickRepliesSettings } from "./QuickRepliesSettings";
import { TemplatesSettings } from "./TemplatesSettings";

// Fictitious catalog data; management (canAccess true) unless stated.
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

describe("Configuración: plantillas, respuestas rápidas, motivos y firmas", () => {
  it("management creates a valid template and sees the preview", async () => {
    const dataProvider = setup();
    const screen = await render(
      <StoryWrapper dataProvider={dataProvider}>
        <TemplatesSettings />
      </StoryWrapper>,
    );

    await screen.getByRole("button", { name: "Agregar" }).click();
    await screen.getByLabelText("Nombre").fill("Primer seguimiento");
    await screen.getByLabelText("Asunto").fill("Cotización para {{empresa}}");
    await screen
      .getByLabelText("Mensaje")
      .fill("Hola {{nombre}}, soy {{ejecutivo}}. ¿Revisaste la {{producto}}?");

    const preview = screen.getByRole("region", { name: "Vista previa" });
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

    await screen.getByRole("button", { name: "Guardar" }).click();
    await expect
      .element(screen.getByText(/^Primer seguimiento · Correo/))
      .toBeVisible();
    expect(await all(dataProvider, "templates")).toMatchObject([
      {
        name: "Primer seguimiento",
        channel: "correo",
        subject: "Cotización para {{empresa}}",
        active: true,
      },
    ]);
  });

  it("rejects a template with an unknown variable", async () => {
    const dataProvider = setup();
    const screen = await render(
      <StoryWrapper dataProvider={dataProvider}>
        <TemplatesSettings />
      </StoryWrapper>,
    );

    await screen.getByRole("button", { name: "Agregar" }).click();
    await screen.getByLabelText("Nombre").fill("Recordatorio");
    await screen.getByLabelText("Canal").selectOptions("whatsapp");
    await screen.getByLabelText("Mensaje").fill("Hola {{cliente}}");
    await screen.getByRole("button", { name: "Guardar" }).click();

    await expect
      .element(screen.getByText("Variables no permitidas: {{cliente}}"))
      .toBeVisible();
    expect(await all(dataProvider, "templates")).toHaveLength(0);
  });

  it("creates and deactivates a quick reply", async () => {
    const dataProvider = setup();
    const screen = await render(
      <StoryWrapper dataProvider={dataProvider}>
        <QuickRepliesSettings />
      </StoryWrapper>,
    );

    await screen.getByRole("button", { name: "Agregar" }).click();
    await screen.getByLabelText("Título").fill("Horario");
    await screen
      .getByLabelText("Texto")
      .fill("Atendemos de lunes a viernes de 9:00 a 18:00.");
    await screen.getByRole("button", { name: "Guardar" }).click();

    await screen.getByRole("button", { name: "Desactivar Horario" }).click();
    await expect.element(screen.getByText(/Inactiva/)).toBeVisible();
    expect(await all(dataProvider, "quick_replies")).toMatchObject([
      { title: "Horario", active: false },
    ]);
  });

  it("moves a lost reason down", async () => {
    const dataProvider = setup({
      lost_reasons: [
        { id: 1, name: "Precio", active: true, position: 0 },
        { id: 2, name: "Plazo de entrega", active: true, position: 1 },
        { id: 3, name: "Sin stock", active: true, position: 2 },
      ],
    });
    const screen = await render(
      <StoryWrapper dataProvider={dataProvider}>
        <LostReasonsSettings />
      </StoryWrapper>,
    );

    await screen.getByRole("button", { name: "Bajar Precio" }).click();

    await expect
      .poll(async () =>
        (await all(dataProvider, "lost_reasons", "position")).map(
          (reason) => reason.name,
        ),
      )
      .toEqual(["Plazo de entrega", "Precio", "Sin stock"]);
    await expect
      .element(
        screen.getByRole("listitem").first().getByText("Plazo de entrega"),
      )
      .toBeVisible();
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

  it("an executive does not see the catalogs", async () => {
    const screen = await render(
      <StoryWrapper
        authProvider={{
          canAccess: async ({ resource }) => resource !== "configuration",
        }}
      >
        <CanAccess resource="deals" action="list">
          <p>Permisos resueltos</p>
        </CanAccess>
        <TemplatesSettings />
        <QuickRepliesSettings />
        <LostReasonsSettings />
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Permisos resueltos")).toBeVisible();
    for (const title of [
      "Plantillas de seguimiento",
      "Respuestas rápidas de WhatsApp",
      "Motivos de pérdida",
    ]) {
      expect(screen.getByText(title).elements()).toHaveLength(0);
    }
  });
});
