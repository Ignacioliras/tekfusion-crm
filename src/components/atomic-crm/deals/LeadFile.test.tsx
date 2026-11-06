import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import type { AuthProvider } from "ra-core";

import { DEFAULT_USER } from "../providers/fakerest/authProvider";
import { canAccess } from "../providers/commons/canAccess";
import { LeadFile } from "./LeadFile.fixtures";

// The StoryWrapper identity (Andrea Soto); the fixture lead belongs to Camila (id 1).
const EXECUTIVE_ID = DEFAULT_USER.id;
// The real rules of canAccess.ts, as the authProviders apply them.
const executiveAccess: Partial<AuthProvider> = {
  canAccess: async (params) => canAccess("user", params, EXECUTIVE_ID),
};
const readerAccess: Partial<AuthProvider> = {
  canAccess: async (params) => canAccess("reader", params, EXECUTIVE_ID),
};

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
        items.nth(0).getByText("Alerta · El cliente respondió por correo", {
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
        items.nth(4).getByText("Cliente pide plazo de entrega a Calama.", {
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

  it("gives an executive only 'Tomar' on an unassigned lead, read-only otherwise", async () => {
    const screen = await render(
      <LeadFile
        deal={{ sales_id: null as never, stage: "nuevo" }}
        authProvider={executiveAccess}
      />,
    );
    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect.element(data.getByText("Sin asignar")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Tomar" }))
      .toBeVisible();

    for (const name of [
      "Marcar contactado",
      "Archive",
      "Editar Línea de negocio",
    ]) {
      await expect
        .element(screen.getByRole("button", { name }))
        .not.toBeInTheDocument();
    }
  });

  it("assigns an unassigned lead to the executive who takes it", async () => {
    const screen = await render(
      <LeadFile
        deal={{ sales_id: null as never, stage: "nuevo" }}
        authProvider={executiveAccess}
      />,
    );
    const data = screen.getByRole("region", { name: "Datos del lead" });

    await screen.getByRole("button", { name: "Tomar" }).click();

    await expect.element(data.getByText("Andrea Soto")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Tomar" }))
      .not.toBeInTheDocument();
  });

  it("lets an executive edit their own lead, without 'Tomar' or 'Reasignar'", async () => {
    const screen = await render(
      <LeadFile
        deal={{ sales_id: EXECUTIVE_ID, stage: "nuevo" }}
        authProvider={executiveAccess}
      />,
    );
    await expect
      .element(screen.getByRole("button", { name: "Editar Línea de negocio" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Marcar contactado" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Archive" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Tomar" }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("button", { name: "Reasignar" }))
      .not.toBeInTheDocument();
  });

  it("shows an executive someone else's lead read-only", async () => {
    const screen = await render(
      <LeadFile deal={{ stage: "nuevo" }} authProvider={executiveAccess} />,
    );
    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect.element(data.getByText("Camila Rojas")).toBeVisible();
    for (const name of [
      "Tomar",
      "Marcar contactado",
      "Archive",
      "Editar Línea de negocio",
    ]) {
      await expect
        .element(screen.getByRole("button", { name }))
        .not.toBeInTheDocument();
    }
  });

  it("marks a new lead as contacted, with its note", async () => {
    const screen = await render(<LeadFile deal={{ stage: "nuevo" }} />);
    const data = screen.getByRole("region", { name: "Datos del lead" });
    await expect
      .element(data.getByText("Nuevo", { exact: true }))
      .toBeVisible();

    await screen.getByRole("button", { name: "Marcar contactado" }).click();
    const dialog = screen.getByRole("dialog", {
      name: "Marcar como contactado",
    });
    await dialog.getByRole("textbox", { name: "Nota" }).fill("Llamé.");
    await dialog.getByRole("button", { name: "Marcar contactado" }).click();

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
