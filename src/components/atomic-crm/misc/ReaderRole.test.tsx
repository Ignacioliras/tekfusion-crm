import { render } from "vitest-browser-react";
import {
  buildCompany,
  buildContact,
  buildDeal,
  StoryWrapper,
} from "@/test/StoryWrapper";

import { canAccess, type AccessRole } from "../providers/commons/canAccess";

// The reader role (sales.role = 'reader') reads everything it may see, but the
// interface offers no create, edit or delete action. The database refuses
// them anyway (RLS); this checks the interface does not offer them. Each
// screen is also rendered for an executive, so a missing control means
// "hidden for the reader", not "never rendered".
const data = {
  companies: [buildCompany({ id: 1, name: "Minera Ficticia" })],
  contacts: [
    buildContact({
      id: 1,
      first_name: "Ada",
      last_name: "Rivas",
      company_id: 1,
    }),
  ],
  deals: [
    buildDeal({
      id: 1,
      name: "Válvulas para relave",
      contact_ids: [1],
      stage: "nuevo",
      expected_closing_date: "2025-02-01",
    }),
  ],
};

const renderAs = (role: AccessRole, path: string) =>
  render(
    <StoryWrapper
      initialEntries={[path]}
      data={data}
      authProvider={{ canAccess: async (params) => canAccess(role, params) }}
    >
      {null}
    </StoryWrapper>,
  );

type Control = { role: "link" | "button"; name: string | RegExp };

const SCREENS: {
  screen: string;
  path: string;
  loaded: string;
  controls: Control[];
}[] = [
  {
    screen: "pipeline",
    path: "/deals",
    loaded: "Válvulas para relave",
    controls: [
      { role: "link", name: "New Deal" },
      { role: "button", name: /Import CSV/ },
    ],
  },
  {
    screen: "lead",
    path: "/deals/1/show",
    loaded: "Ada Rivas",
    controls: [
      { role: "button", name: "Archive" },
      { role: "link", name: "Edit" },
      { role: "button", name: "Add this note" },
    ],
  },
  {
    screen: "contact",
    path: "/contacts/1/show",
    loaded: "ada@example.com",
    controls: [
      { role: "link", name: "Edit contact" },
      { role: "button", name: "Add this note" },
      { role: "button", name: "Add tag" },
      { role: "button", name: "Add task" },
    ],
  },
  {
    screen: "companies",
    path: "/companies",
    loaded: "Minera Ficticia",
    controls: [
      { role: "link", name: "New Company" },
      { role: "button", name: /Import CSV/ },
    ],
  },
];

describe("reader role", () => {
  describe.each(SCREENS)("$screen", ({ path, loaded, controls }) => {
    it("offers its write actions to an executive", async () => {
      const screen = await renderAs("user", path);
      for (const { role, name } of controls) {
        await expect.element(screen.getByRole(role, { name })).toBeVisible();
      }
    });

    it("hides every write action from a reader", async () => {
      const screen = await renderAs("reader", path);
      await expect.element(screen.getByText(loaded).first()).toBeVisible();
      for (const { role, name } of controls) {
        expect(screen.getByRole(role, { name }).elements()).toHaveLength(0);
      }
    });
  });
});
