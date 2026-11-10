import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { StoryWrapper } from "@/test/StoryWrapper";
import { ManagementDashboard } from "./ManagementDashboard";
import {
  buildRow,
  DashboardWithoutData,
  DashboardWithTwoMonths,
  EARLIER,
} from "./ManagementDashboard.fixtures";

describe("Dashboard de gerencia: métricas con rango de fechas", () => {
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
          .getByRole("button", { name: "$6.000.000" }),
      )
      .toHaveTextContent("$6 M");
  });

  it("shows a large amount compact and keeps the exact figure accessible", async () => {
    const screen = await render(
      <StoryWrapper
        data={{
          dashboard_daily: [
            buildRow({ leads: 1, won: 1, won_amount: 1_234_567_890 }),
          ],
        }}
      >
        <ManagementDashboard />
      </StoryWrapper>,
    );

    const amount = screen
      .getByRole("group", { name: "Monto ganado" })
      .getByRole("button", { name: "$1.234.567.890" });
    await expect.element(amount).toHaveTextContent("$1234,6 M");

    await amount.hover();
    await expect
      .element(screen.getByText("$1.234.567.890", { exact: true }))
      .toBeVisible();
  });

  it("the last 12 months shortcut takes in the earlier period", async () => {
    const screen = await render(<DashboardWithTwoMonths />);
    const leads = screen.getByRole("group", { name: "Leads" });
    await expect.element(leads.getByText("6", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "Últimos 12 meses" }).click();

    await expect
      .element(screen.getByRole("button", { name: "Últimos 12 meses" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect.element(leads.getByText("9", { exact: true })).toBeVisible();
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

    await screen.getByLabelText("Desde").fill(EARLIER);

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

  it("opens on the last 30 days and says which period it compares with", async () => {
    const screen = await render(<DashboardWithTwoMonths />);

    await expect
      .element(screen.getByRole("button", { name: "Últimos 30 días" }))
      .toHaveAttribute("aria-pressed", "true");
    await expect
      .element(screen.getByText(/^Comparado con el período anterior:/))
      .toBeVisible();
    await expect
      .element(
        screen
          .getByRole("region", { name: "Tasa de cierre por mes" })
          .getByText(/^Período anterior \(/),
      )
      .toBeVisible();
  });

  it("a shortcut changes the range and the numbers", async () => {
    const screen = await render(<DashboardWithTwoMonths />);
    const leads = screen.getByRole("group", { name: "Leads" });
    await expect.element(leads.getByText("6", { exact: true })).toBeVisible();

    await screen.getByRole("button", { name: "Últimos 90 días" }).click();

    await expect.element(leads.getByText("9", { exact: true })).toBeVisible();
  });

  it("shows the empty state in Spanish when there is no data", async () => {
    const screen = await render(<DashboardWithoutData />);
    await expect
      .element(screen.getByText("No hay leads en el período elegido."))
      .toBeVisible();
  });
});
