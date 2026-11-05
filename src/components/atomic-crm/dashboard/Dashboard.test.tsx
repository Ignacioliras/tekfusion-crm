import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { buildCompany, buildDeal, StoryWrapper } from "@/test/StoryWrapper";

import { Dashboard } from "./Dashboard";

// The dashboard under the management metrics: Atomic's side widgets only
// when they have something to show, and notes without author attributed to
// the system (n8n ingestion, imports) instead of a blank name.
const data = {
  companies: [buildCompany({ id: 1, name: "Minera Ficticia" })],
  deals: [buildDeal({ id: 1, name: "Válvulas para relave", company_id: 1 })],
  deal_notes: [
    {
      id: 1,
      deal_id: 1,
      text: "Correo recibido: piden 12 válvulas",
      date: new Date().toISOString(),
      sales_id: null,
    },
  ],
  contacts: [],
  tasks: [],
};

describe("Dashboard", () => {
  beforeAll(() => {
    page.viewport(1440, 1000);
  });

  it("leaves out the empty hot contacts and tasks widgets", async () => {
    const screen = await render(
      <StoryWrapper data={data as never}>
        <Dashboard />
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByText("Correo recibido: piden 12 válvulas"))
      .toBeVisible();
    expect(screen.getByText("Hot Contacts").elements()).toHaveLength(0);
    expect(screen.getByText("Upcoming Tasks").elements()).toHaveLength(0);
  });

  it("attributes a note without author to the system", async () => {
    const screen = await render(
      <StoryWrapper data={data as never}>
        <Dashboard />
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByText(/^El sistema added a note about deal/))
      .toBeVisible();
  });
});
