import cloneDeep from "lodash/cloneDeep";
import { render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";

import { createCrmDb } from "@/test/StoryWrapper";
import { createDataProvider } from "../providers/fakerest";
import type { AccessRole } from "../providers/commons/canAccess";
import type { Deal } from "../types";
import { ReorderPipeline, reorderData } from "./DealList.fixtures";

const DRAG_HANDLE = "[data-rfd-drag-handle-draggable-id]";

// FakeRest has no RLS, so the test reads the indexes back: a neighbour the
// executive may not update must keep its index.
const renderPipeline = async (role: AccessRole) => {
  const dataProvider = createDataProvider({
    db: createCrmDb(cloneDeep(reorderData)),
    silent: true,
  });
  const indexOf = async (id: number) =>
    (await dataProvider.getOne<Deal>("deals", { id })).data.index;
  const screen = await render(
    <ReorderPipeline role={role} dataProvider={dataProvider} />,
  );
  return { screen, indexOf };
};

// Keyboard drag (hello-pangea/dnd) of the executive's lead, from the top of
// "Nuevo" to the bottom, past the unassigned lead and the other executive's.
const dragOwnLeadToBottom = async (
  screen: Awaited<ReturnType<typeof renderPipeline>>["screen"],
) => {
  const card = screen
    .getByRole("region", { name: "Nuevo" })
    .getByText("Lead propio");
  // The card is draggable only once canAccess resolves: wait for the handle.
  await expect.poll(() => card.element().closest(DRAG_HANDLE)).not.toBeNull();
  (card.element().closest(DRAG_HANDLE) as HTMLElement).focus();
  await userEvent.keyboard(" ");
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard("{ArrowDown}");
  await userEvent.keyboard(" ");
};

const handleOf = (
  screen: Awaited<ReturnType<typeof renderPipeline>>["screen"],
  name: string,
) =>
  screen
    .getByRole("region", { name: "Nuevo" })
    .getByText(name)
    .element()
    .closest(DRAG_HANDLE);

describe("Kanban: quién puede arrastrar cada tarjeta", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  it("lets a manager drag every card, including unassigned and others' leads", async () => {
    const { screen } = await renderPipeline("admin");

    await expect.poll(() => handleOf(screen, "Lead propio")).not.toBeNull();
    await expect
      .poll(() => handleOf(screen, "Lead sin asignar"))
      .not.toBeNull();
    await expect.poll(() => handleOf(screen, "Lead ajeno")).not.toBeNull();
  });

  it("lets an executive drag only their own card", async () => {
    const { screen } = await renderPipeline("user");

    // Once their own card is draggable, permissions and identity are loaded.
    await expect.poll(() => handleOf(screen, "Lead propio")).not.toBeNull();
    expect(handleOf(screen, "Lead sin asignar")).toBeNull();
    expect(handleOf(screen, "Lead ajeno")).toBeNull();
  });

  it("lets the reader drag no card", async () => {
    const { screen } = await renderPipeline("reader");

    await expect
      .element(screen.getByText("Lead ajeno", { exact: true }))
      .toBeVisible();
    expect(handleOf(screen, "Lead propio")).toBeNull();
    expect(handleOf(screen, "Lead sin asignar")).toBeNull();
    expect(handleOf(screen, "Lead ajeno")).toBeNull();
  });
});

describe("Kanban: reordenar una columna respeta de quién es cada lead", () => {
  beforeAll(() => {
    page.viewport(1600, 1000);
  });

  it("only moves the executive's own lead, leaving unassigned and others' leads in place", async () => {
    const { screen, indexOf } = await renderPipeline("user");

    await dragOwnLeadToBottom(screen);

    await expect.poll(() => indexOf(1)).toBe(2);
    expect(await indexOf(2)).toBe(1);
    expect(await indexOf(3)).toBe(2);
  });

  it("shifts every lead of the column for a manager", async () => {
    const { screen, indexOf } = await renderPipeline("admin");

    await dragOwnLeadToBottom(screen);

    await expect.poll(() => indexOf(1)).toBe(2);
    await expect.poll(() => indexOf(2)).toBe(0);
    await expect.poll(() => indexOf(3)).toBe(1);
  });
});
