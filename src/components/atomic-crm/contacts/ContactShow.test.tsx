import {
  ResourceContextProvider,
  ShowBase,
  useDataProvider,
  type DataProvider,
} from "ra-core";
import { useQueryClient } from "@tanstack/react-query";
import { render } from "vitest-browser-react";
import { createDataProvider } from "@/components/atomic-crm/providers/fakerest";
import {
  buildContact,
  buildDeal,
  createCrmDb,
  StoryWrapper,
} from "@/test/StoryWrapper";
import { ContactAside } from "./ContactAside";
import { ContactShow } from "./ContactShow";
import { MobileSuccess } from "./ContactShow.mobile.fixtures";

const mockIsMobile = vi.hoisted(() => vi.fn(() => true));
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: mockIsMobile,
}));

describe("ContactShow", () => {
  beforeEach(() => {
    mockIsMobile.mockReturnValue(true);
  });

  it("renders a safe zero-task label before nb_tasks is available", async () => {
    const screen = await render(<MobileSuccess />);

    await expect
      .element(screen.getByRole("tab", { name: "0 tasks" }))
      .toBeVisible();
    await expect
      .poll(
        () => screen.container.textContent?.includes("%{smart_count}") ?? false,
      )
      .toBe(false);
    await expect
      .poll(() => screen.container.textContent?.includes("||||") ?? false)
      .toBe(false);
  });

  it("offers search but no refresh in the header of a contact page", async () => {
    const screen = await render(<MobileSuccess />);

    await expect
      .element(screen.getByRole("button", { name: "Search", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Refresh" }))
      .not.toBeInTheDocument();
  });

  it("opens on the tab named in the URL, as global search links to tasks", async () => {
    const screen = await render(
      <StoryWrapper
        data={{ contacts: [buildContact({ id: 1 })] }}
        initialEntries={["/?tab=tasks"]}
      >
        <ContactShow resource="contacts" id={1} />
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByRole("tab", { name: "0 tasks" }))
      .toHaveAttribute("aria-selected", "true");
  });

  it("links phone numbers to the dialer, keeping the extension as a pause", async () => {
    const screen = await render(
      <StoryWrapper
        data={{
          contacts: [
            buildContact({
              id: 1,
              phone_jsonb: [{ number: "(263) 963-6427 x6649", type: "Work" }],
            }),
          ],
        }}
        initialEntries={["/?tab=details"]}
      >
        <ContactShow resource="contacts" id={1} />
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByRole("link", { name: "(263) 963-6427 x6649" }))
      .toHaveAttribute("href", "tel:2639636427,6649");
  });

  it("shows an error when the contact cannot be loaded", async () => {
    const screen = await render(
      <StoryWrapper data={{ contacts: [] }}>
        {/* An id no other test loads, so no persisted query cache can serve it */}
        <ContactShow resource="contacts" id={404} />
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByText("Error loading contact"))
      .toBeVisible();
  });

  it("keeps showing a loaded contact when refreshing it fails", async () => {
    const contact = buildContact({ id: 405 });
    const baseDataProvider = createDataProvider({
      db: createCrmDb({ contacts: [contact] }),
      silent: true,
    });
    let isOffline = false;
    let refetchQueries: (() => Promise<void>) | null = null;

    const QueryClientListener = () => {
      const queryClient = useQueryClient();
      refetchQueries = () => queryClient.refetchQueries();
      return null;
    };

    const screen = await render(
      <StoryWrapper
        data={{ contacts: [contact] }}
        dataProvider={{
          getOne: (resource, params) =>
            isOffline && resource === "contacts"
              ? Promise.reject(new Error("Failed to fetch"))
              : baseDataProvider.getOne(resource, params),
        }}
      >
        <QueryClientListener />
        <ContactShow resource="contacts" id={contact.id} />
      </StoryWrapper>,
    );
    await expect
      .element(screen.getByRole("tab", { name: "0 tasks" }))
      .toBeVisible();

    isOffline = true;
    await refetchQueries!();

    await expect
      .element(screen.getByText("Error loading contact"))
      .not.toBeInTheDocument();
    await expect
      .element(screen.getByRole("tab", { name: "0 tasks" }))
      .toBeVisible();
  });

  it("updates the contact status from the aside", async () => {
    mockIsMobile.mockReturnValue(false);

    let dataProvider: DataProvider | null = null;
    const contact = buildContact({ status: "warm" });

    const DataProviderListener = () => {
      dataProvider = useDataProvider();
      return null;
    };

    const screen = await render(
      <StoryWrapper data={{ contacts: [contact] }}>
        <DataProviderListener />
        <ResourceContextProvider value="contacts">
          <ShowBase id={contact.id}>
            <ContactAside />
          </ShowBase>
        </ResourceContextProvider>
      </StoryWrapper>,
    );

    await expect
      .element(screen.getByRole("combobox"))
      .toHaveTextContent("Tibio");

    await screen.getByRole("combobox").click();
    await screen.getByRole("option", { name: /caliente/i }).click();

    await expect
      .poll(async () => {
        const { data } = await dataProvider!.getOne("contacts", {
          id: contact.id,
        });
        return data.status;
      })
      .toBe("hot");

    await expect
      .element(screen.getByRole("combobox"))
      .toHaveTextContent("Caliente");
  });

  it("lists what the merge will move in spanish, not in english", async () => {
    // Arrange
    mockIsMobile.mockReturnValue(false);
    const loser = buildContact({
      id: 1,
      email_jsonb: [
        { email: "ada@example.com", type: "Work" },
        { email: "ada@casa.example", type: "Home" },
      ],
      phone_jsonb: [{ number: "+56 9 1111 2222", type: "Work" }],
    });
    const duplicate = buildContact({ id: 2, email_jsonb: [] });
    const screen = await render(
      <StoryWrapper
        data={{
          contacts: [loser, duplicate],
          contact_notes: [1, 2].map((id) => ({
            id,
            contact_id: 1,
            text: `Nota ${id}`,
            date: "2025-01-03T10:00:00.000Z",
            sales_id: 0,
            status: "warm",
            attachments: [],
          })),
          tasks: [
            {
              id: 1,
              contact_id: 1,
              type: "call",
              text: "Llamar",
              due_date: "2025-01-04T10:00:00.000Z",
              sales_id: 0,
            },
          ],
          deals: [buildDeal({ contact_ids: [1] })],
        }}
      >
        <ResourceContextProvider value="contacts">
          {/* The merge button lives in the aside of the edit page (link="show") */}
          <ShowBase id={loser.id}>
            <ContactAside link="show" />
          </ShowBase>
        </ResourceContextProvider>
      </StoryWrapper>,
    );

    // Act
    await screen
      .getByRole("button", { name: "Merge with another contact" })
      .click();

    // Assert
    const dialog = screen.getByRole("dialog");
    for (const text of [
      "2 notas se reasignarán",
      "1 tarea se reasignará",
      "1 lead se actualizará",
      "Se agregarán 2 correos",
      "Se agregará 1 teléfono",
    ]) {
      // Each item starts with a "•" bullet, so match the text inside it.
      await expect
        .element(dialog.getByText(new RegExp(`• ${text}$`)))
        .toBeVisible();
    }
    expect(dialog.element().textContent).not.toMatch(
      /will be (reassigned|updated|added)/,
    );
  });
});
