import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { LeadFile, executiveAccess, readerAccess } from "./LeadFile.fixtures";

describe("Ficha del lead", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  it("shows one timeline mixing notes, stage changes, quotes, follow-ups and alerts, newest first", async () => {
    const screen = await render(<LeadFile />);
    const timeline = screen.getByRole("region", { name: "Línea de tiempo" });

    await expect
      .element(timeline.getByText("Alerta · El cliente respondió por correo"))
      .toBeVisible();
    const items = timeline.getByRole("listitem");
    await expect
      .element(
        items
          .nth(0)
          .getByText("Alerta · El cliente respondió por correo", {
            exact: false,
          }),
      )
      .toBeVisible();
    await expect
      .element(
        items
          .nth(1)
          .getByText("Seguimiento 1 enviado por Correo", { exact: false }),
      )
      .toBeVisible();
    await expect
      .element(
        items.nth(2).getByText("Cotización v1 · $4.500.000", { exact: false }),
      )
      .toBeVisible();
    await expect
      .element(
        items
          .nth(2)
          .getByText("Enviada por Correo · entregada", { exact: false }),
      )
      .toBeVisible();
    await expect
      .element(
        items.nth(3).getByText("Etapa: Nuevo → Contactado", { exact: false }),
      )
      .toBeVisible();
    await expect
      .element(items.nth(3).getByText("por Camila Rojas", { exact: false }))
      .toBeVisible();
    await expect
      .element(
        items
          .nth(4)
          .getByText("Cliente pide plazo de entrega a Calama.", {
            exact: false,
          }),
      )
      .toBeVisible();
    await expect
      .element(items.nth(5).getByText("Lead creado · Correo", { exact: false }))
      .toBeVisible();
  });

  it("edits the business line in place and keeps the new value", async () => {
    const screen = await render(<LeadFile />);
    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect
      .element(data.getByText("Válvulas", { exact: true }))
      .toBeVisible();

    await data.getByRole("button", { name: "Editar Línea de negocio" }).click();
    await data.getByRole("combobox", { name: "Línea de negocio" }).click();
    await screen.getByRole("option", { name: "Tuberías" }).click();
    await data.getByRole("button", { name: "Guardar" }).click();

    await expect
      .element(data.getByText("Tuberías", { exact: true }))
      .toBeVisible();
    await expect
      .element(data.getByRole("button", { name: "Guardar" }))
      .not.toBeInTheDocument();
  });

  it("lets anyone who can edit take an unassigned lead", async () => {
    const screen = await render(
      <LeadFile
        deal={{ sales_id: null as never, stage: "nuevo" }}
        authProvider={executiveAccess}
      />,
    );
    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect.element(data.getByText("Sin asignar")).toBeVisible();

    await screen.getByRole("button", { name: "Tomar" }).click();

    await expect.element(data.getByText("Andrea Soto")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Tomar" }))
      .not.toBeInTheDocument();
  });

  it("marks a new lead as contacted", async () => {
    const screen = await render(<LeadFile deal={{ stage: "nuevo" }} />);
    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect
      .element(data.getByText("Nuevo", { exact: true }))
      .toBeVisible();

    await screen.getByRole("button", { name: "Marcar contactado" }).click();

    await expect
      .element(data.getByText("Contactado", { exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Marcar contactado" }))
      .not.toBeInTheDocument();
  });

  it("reassigns the lead: managers only", async () => {
    const screen = await render(<LeadFile />);
    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect.element(data.getByText("Camila Rojas")).toBeVisible();

    await screen.getByRole("button", { name: "Reasignar" }).click();
    const dialog = screen.getByRole("dialog", { name: "Reasignar lead" });
    await dialog.getByRole("combobox", { name: "Ejecutivo" }).click();
    await screen.getByRole("option", { name: "Andrea Soto" }).click();
    await dialog.getByRole("button", { name: "Reasignar" }).click();

    await expect.element(data.getByText("Andrea Soto")).toBeVisible();
  });

  it("hides the reassign action from an executive", async () => {
    const screen = await render(<LeadFile authProvider={executiveAccess} />);
    await expect
      .element(screen.getByRole("region", { name: "Datos del lead" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Editar Línea de negocio" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Reasignar" }))
      .not.toBeInTheDocument();
  });

  it("shows a reader the file without any action or edit control", async () => {
    const screen = await render(
      <LeadFile
        deal={{ sales_id: null as never, stage: "nuevo" }}
        authProvider={readerAccess}
      />,
    );
    await expect
      .element(screen.getByRole("region", { name: "Línea de tiempo" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Tomar" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Marcar contactado" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Editar Línea de negocio" }))
      .not.toBeInTheDocument();
  });
});
