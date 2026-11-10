import { subDays } from "date-fns";
import { ResourceContextProvider } from "ra-core";
import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import DealList from "./DealList";

import {
  StoryWrapper,
  buildCompany,
  buildDeal,
  buildSale,
} from "@/test/StoryWrapper";

const daysAgo = (days: number) => subDays(new Date(), days).toISOString();

const data = {
  companies: [buildCompany()],
  sales: [buildSale({ administrator: true, id: 0 })],
  deals: [
    buildDeal({ id: 1, index: 0, name: "Lead nuevo antiguo", stage: "nuevo" }),
    buildDeal({
      id: 2,
      index: 0,
      name: "Lead cotizado antiguo",
      stage: "cotizado",
    }),
    buildDeal({
      id: 3,
      index: 0,
      name: "Perdido hace 40 días",
      stage: "perdido",
      closed_at: daysAgo(40),
    }),
    buildDeal({
      id: 4,
      index: 1,
      name: "Perdido hace 10 días",
      stage: "perdido",
      closed_at: daysAgo(10),
    }),
    buildDeal({
      id: 5,
      index: 0,
      name: "Ganado hace 40 días",
      stage: "ganado",
      closed_at: daysAgo(40),
    }),
    buildDeal({
      id: 6,
      index: 0,
      name: "Archivado hace 5 días",
      stage: "archivado",
      closed_at: daysAgo(5),
    }),
  ],
};

describe("DealList kanban, closed leads", () => {
  beforeAll(() => {
    page.viewport(1600, 900);
  });

  it("hides leads closed more than 30 days ago and keeps recent closed and open ones", async () => {
    const screen = await render(
      <StoryWrapper data={data}>
        <ResourceContextProvider value="deals">
          <DealList />
        </ResourceContextProvider>
      </StoryWrapper>,
    );

    for (const name of [
      "Lead nuevo antiguo",
      "Lead cotizado antiguo",
      "Perdido hace 10 días",
      "Archivado hace 5 días",
    ]) {
      await expect
        .element(screen.getByText(name, { exact: true }))
        .toBeVisible();
    }
    await expect
      .element(screen.getByText("Perdido hace 40 días", { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByText("Ganado hace 40 días", { exact: true }))
      .not.toBeInTheDocument();
  });
});
