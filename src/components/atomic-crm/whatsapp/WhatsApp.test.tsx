import { render } from "vitest-browser-react";

import { WhatsAppInbox } from "./WhatsApp.fixtures";

const openConversation = async (
  role: "admin" | "user",
  name: string,
  tab?: string,
) => {
  const screen = await render(<WhatsAppInbox role={role} />);
  if (tab) {
    await screen.getByRole("tab", { name: tab }).click();
  }
  const startsWithName = new RegExp(`^${name.replace("+", "\\+")}`);
  await screen.getByRole("button", { name: startsWithName }).click();
  const panel = screen.getByRole("region", { name });
  await expect.element(panel).toBeVisible();
  return { screen, panel };
};

describe("Bandeja de WhatsApp", () => {
  it("shows the executive their chats and the unassigned ones, never another executive's", async () => {
    const screen = await render(<WhatsAppInbox role="user" />);

    await expect.element(screen.getByText("Rosa Pizarro")).toBeVisible();
    await expect.element(screen.getByLabelText("3 sin leer")).toBeVisible();
    expect(screen.getByText("+56900000003").elements()).toHaveLength(0);
    expect(screen.getByText("Andrés Vega").elements()).toHaveLength(0);
    expect(screen.getByRole("tab", { name: "Todos" }).elements()).toHaveLength(
      0,
    );

    await screen.getByRole("tab", { name: "Sin asignar" }).click();
    await expect.element(screen.getByText("+56900000003")).toBeVisible();
    expect(screen.getByText("Rosa Pizarro").elements()).toHaveLength(0);
    expect(screen.getByText("Andrés Vega").elements()).toHaveLength(0);
  });

  it("gives managers the 'Todos' tab with every conversation, newest first", async () => {
    const screen = await render(<WhatsAppInbox role="admin" />);

    await screen.getByRole("tab", { name: "Todos" }).click();
    await expect.element(screen.getByText("Andrés Vega")).toBeVisible();
    const titles = screen
      .getByRole("listitem")
      .elements()
      .map((item) => item.querySelector("span span")?.textContent);
    expect(titles).toEqual(["Rosa Pizarro", "+56900000003", "Andrés Vega"]);
  });

  it("shows the reader a notice and no conversation", async () => {
    const screen = await render(<WhatsAppInbox role="reader" />);

    await expect
      .element(
        screen.getByText(
          "Tu perfil no tiene acceso a las conversaciones de WhatsApp.",
        ),
      )
      .toBeVisible();
    expect(screen.getByText("Rosa Pizarro").elements()).toHaveLength(0);
    expect(screen.getByRole("tab").elements()).toHaveLength(0);
  });

  it("shows HTML from a message as literal text", async () => {
    const { panel } = await openConversation("user", "Rosa Pizarro");

    await expect.element(panel.getByText("<b>hola</b><script>")).toBeVisible();
    expect(panel.element().querySelector("b, script")).toBeNull();
  });

  it("draws read and delivered marks, attachments as links and audio with a player", async () => {
    const { panel } = await openConversation("user", "Rosa Pizarro");

    const read = panel.getByRole("img", { name: "Leído" });
    await expect.element(read).toHaveTextContent("✓✓");
    await expect.element(read).toHaveClass("text-sky-500");
    await expect
      .element(panel.getByRole("img", { name: "Entregado" }))
      .toHaveTextContent("✓✓");
    await expect
      .element(panel.getByRole("link", { name: "ficha-tecnica-demo.pdf" }))
      .toHaveAttribute("href", "whatsapp/demo/ficha-tecnica-demo.pdf");
    expect(panel.element().querySelector("audio[controls]")).not.toBeNull();
  });

  it("marks sent and failed messages in another executive's chat for managers", async () => {
    const { panel } = await openConversation("admin", "Andrés Vega", "Todos");

    await expect
      .element(panel.getByRole("img", { name: "Enviado" }))
      .toHaveTextContent("✓");
    await expect
      .element(panel.getByRole("img", { name: "No se pudo enviar" }))
      .toBeVisible();
  });

  it("labels messages typed on the phone and names the executive behind each CRM send", async () => {
    const { panel } = await openConversation("admin", "Andrés Vega", "Todos");

    await expect
      .element(panel.getByText("Desde el teléfono · Matías Soto"))
      .toBeVisible();
    // The failed photo went out from the CRM: only its author, no phone label.
    await expect
      .element(panel.getByText("Matías Soto", { exact: true }))
      .toBeVisible();
    expect(panel.getByText(/Desde el teléfono/).elements()).toHaveLength(1);
  });

  it("names the author of CRM sends but not of incoming messages", async () => {
    const { panel } = await openConversation("user", "Rosa Pizarro");

    // Two outgoing CRM messages in Rosa's chat, three incoming ones.
    await expect
      .poll(() => panel.getByText("Jane Doe", { exact: true }).elements())
      .toHaveLength(2);
    expect(panel.getByText(/Desde el teléfono/).elements()).toHaveLength(0);
  });

  it("lets the executive take an unassigned chat, which then shows in 'Mis chats'", async () => {
    const { screen, panel } = await openConversation(
      "user",
      "+56900000003",
      "Sin asignar",
    );

    await panel.getByRole("button", { name: "Tomar" }).click();

    await expect
      .element(screen.getByText("Tomaste la conversación"))
      .toBeVisible();
    expect(
      panel.getByRole("button", { name: "Tomar" }).elements(),
    ).toHaveLength(0);
    await screen.getByRole("tab", { name: "Mis chats" }).click();
    await expect
      .element(screen.getByRole("button", { name: /^\+56900000003/ }))
      .toBeVisible();
  });

  it("marks an assigned chat read when it is opened", async () => {
    const screen = await render(<WhatsAppInbox role="user" />);
    await expect.element(screen.getByLabelText("3 sin leer")).toBeVisible();

    await screen.getByRole("button", { name: /^Rosa Pizarro/ }).click();

    await expect
      .element(screen.getByLabelText("3 sin leer"))
      .not.toBeInTheDocument();
  });

  it("keeps the composer disabled until sending is enabled", async () => {
    const { panel } = await openConversation("admin", "Rosa Pizarro");

    await expect
      .element(panel.getByRole("textbox", { name: "Escribe un mensaje" }))
      .toBeDisabled();
    await expect
      .element(panel.getByRole("button", { name: "Enviar" }))
      .toBeDisabled();
  });
});
