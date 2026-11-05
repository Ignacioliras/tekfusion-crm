import { render } from "vitest-browser-react";
import { page, type Locator } from "vitest/browser";

import {
  DashboardForManager,
  DashboardForRole,
  EARLIER,
} from "./ManagementDashboard.fixtures";

const RANKING = "Ranking de ejecutivos";

// Executive, attended, average first response, quotes sent, won, won amount.
const expectCells = async (row: Locator, cells: string[]) => {
  for (const [index, text] of cells.entries()) {
    await expect
      .element(row.getByRole("cell").nth(index))
      .toHaveTextContent(text);
  }
};

describe("Ranking de ejecutivos en el dashboard, solo gerencia", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  it("shows managers the executives sorted by won amount with the range totals", async () => {
    const screen = await render(<DashboardForManager />);

    const rows = screen.getByRole("region", { name: RANKING }).getByRole("row");
    await expectCells(rows.nth(1), [
      "Tomás Fuentes",
      "2",
      "12 h",
      "3",
      "2",
      "$4.000.000",
    ]);
    await expectCells(rows.nth(2), [
      "Valentina Soto",
      "2",
      "4 h",
      "1",
      "1",
      "$500.000",
    ]);
  });

  it("recomputes the ranking when the range changes", async () => {
    const screen = await render(<DashboardForManager />);
    const rows = screen.getByRole("region", { name: RANKING }).getByRole("row");
    await expect.element(rows.nth(1).getByText("Tomás Fuentes")).toBeVisible();

    await screen.getByLabelText("Desde").fill(EARLIER);

    // Valentina adds the earlier $5.000.000 and goes first.
    await expectCells(rows.nth(1), [
      "Valentina Soto",
      "4",
      "7 h",
      "3",
      "2",
      "$5.500.000",
    ]);
    await expect.element(rows.nth(2).getByText("Tomás Fuentes")).toBeVisible();
  });

  it.each([
    ["executive", "user"],
    ["reader", "reader"],
  ] as const)("hides the ranking from the %s role", async (_label, role) => {
    const screen = await render(<DashboardForRole role={role} />);

    // The metrics are there, so the ranking had its chance to render.
    await expect
      .element(screen.getByRole("group", { name: "Leads" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("region", { name: RANKING }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Valentina Soto"))
      .not.toBeInTheDocument();
  });
});
