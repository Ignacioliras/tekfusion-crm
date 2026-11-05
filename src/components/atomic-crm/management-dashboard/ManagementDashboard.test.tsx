import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import {
  DashboardWithoutData,
  DashboardWithTwoMonths,
  LAST_MONTH,
} from "./ManagementDashboard.fixtures";

describe("Dashboard de gerencia: métricas con filtro de meses", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  it("shows this month's totals and the share answered within 24 h", async () => {
    const screen = await render(<DashboardWithTwoMonths />);

    const leads = screen.getByRole("group", { name: "Leads" });
    await expect.element(leads.getByText("6", { exact: true })).toBeVisible();
    await expect.element(leads.getByText("Período anterior: 3")).toBeVisible();
    const within24h = screen.getByRole("group", {
      name: "Respondidos en 24 h",
    });
    await expect.element(within24h.getByText("75%")).toBeVisible();
    await expect
      .element(within24h.getByText("Período anterior: 0%"))
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("group", { name: "Primera respuesta promedio" })
          .getByText("8,5 h"),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("group", { name: "Tasa de cierre" }).getByText("33%"),
      )
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("group", { name: "Monto cotizado" })
          .getByText("$6.000.000"),
      )
      .toBeVisible();
  });

  it("recomputes the numbers when the range changes", async () => {
    const screen = await render(<DashboardWithTwoMonths />);
    await expect
      .element(
        screen.getByRole("group", { name: "Leads" }).getByText("6", {
          exact: true,
        }),
      )
      .toBeVisible();

    await screen.getByLabelText("Desde").fill(LAST_MONTH);

    const leads = screen.getByRole("group", { name: "Leads" });
    await expect.element(leads.getByText("9", { exact: true })).toBeVisible();
    await expect
      .element(
        screen
          .getByRole("group", { name: "Respondidos en 24 h" })
          .getByText("50%"),
      )
      .toBeVisible();
  });

  it("shows the empty state in Spanish when there is no data", async () => {
    const screen = await render(<DashboardWithoutData />);
    await expect
      .element(screen.getByText("No hay leads en el período elegido."))
      .toBeVisible();
  });
});
