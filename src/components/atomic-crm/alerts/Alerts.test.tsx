import { render } from "vitest-browser-react";

import { Alerts } from "./Alerts.fixtures";

const openPanel = async () => {
  const screen = await render(<Alerts />);
  const bell = screen.getByRole("button", { name: "Alertas: 3 sin leer" });
  await expect.element(bell).toBeVisible();
  await bell.click();
  await expect
    .element(screen.getByRole("region", { name: "Sin contacto en 24 h" }))
    .toBeVisible();
  return screen;
};

describe("Panel de alertas", () => {
  it("counts only the current user's unread alerts", async () => {
    const screen = await render(<Alerts />);

    await expect
      .element(screen.getByRole("button", { name: "Alertas: 3 sin leer" }))
      .toBeVisible();
  });

  it("groups the alerts by type and leaves out read and foreign ones", async () => {
    const screen = await openPanel();

    const noContact = screen.getByRole("region", {
      name: "Sin contacto en 24 h",
    });
    expect(noContact.getByRole("listitem").elements()).toHaveLength(2);
    const whatsapp = screen.getByRole("region", {
      name: "WhatsApp desconectado",
    });
    await expect
      .element(whatsapp.getByText("El WhatsApp corporativo se desconectó"))
      .toBeVisible();
    expect(whatsapp.getByRole("link").elements()).toHaveLength(0);
    expect(
      screen.getByRole("region", { name: "Cliente respondió" }).elements(),
    ).toHaveLength(0);
    expect(
      screen.getByText("Alerta de otro ejecutivo").elements(),
    ).toHaveLength(0);
  });

  it("says company, line and what happened, with the lead underneath", async () => {
    const screen = await openPanel();

    const noContact = screen.getByRole("region", {
      name: "Sin contacto en 24 h",
    });
    await expect
      .element(
        noContact.getByText(
          "Edificaciones Cordillera · Geoceldas: sin contacto hace 26 h",
        ),
      )
      .toBeVisible();
    await expect
      .element(
        noContact.getByText(
          "Minera Ficticia · Válvulas: sin contacto hace 30 h",
        ),
      )
      .toBeVisible();
    await expect
      .element(noContact.getByText(/Geoceldas para talud norte/))
      .toBeVisible();
  });

  it("links each alert to its lead file", async () => {
    const screen = await openPanel();

    const links = screen
      .getByRole("region", { name: "Sin contacto en 24 h" })
      .getByRole("link", { name: "Ver lead" });
    await expect.element(links.nth(0)).toHaveAttribute("href", "/deals/2/show");
    await expect.element(links.nth(1)).toHaveAttribute("href", "/deals/1/show");
  });

  it("marking one alert as read lowers the counter", async () => {
    const screen = await openPanel();

    await screen
      .getByRole("region", { name: "WhatsApp desconectado" })
      .getByRole("button", { name: "Marcar leída" })
      .click();

    await expect
      .element(screen.getByRole("button", { name: "Alertas: 2 sin leer" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole("region", { name: "WhatsApp desconectado" }))
      .not.toBeInTheDocument();
  });

  it("marking all as read leaves the counter at zero", async () => {
    const screen = await openPanel();

    await screen
      .getByRole("button", { name: "Marcar todas como leídas" })
      .click();

    await expect
      .element(screen.getByRole("button", { name: "Alertas: 0 sin leer" }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText("No tienes alertas pendientes."))
      .toBeVisible();
  });
});
