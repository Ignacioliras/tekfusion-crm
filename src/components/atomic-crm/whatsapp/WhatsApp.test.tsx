import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { ArchivedChatPanel, WhatsAppInbox } from "./WhatsApp.fixtures";

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

  it("lets the executive send a message to their chat and shows it pending", async () => {
    const { panel } = await openConversation("user", "Rosa Pizarro");
    const composer = panel.getByRole("textbox", { name: "Escribe un mensaje" });

    await composer.fill("  Le envío la ficha técnica hoy.  ");
    await panel.getByRole("button", { name: "Enviar" }).click();

    await expect
      .element(panel.getByText("Le envío la ficha técnica hoy."))
      .toBeVisible();
    await expect
      .element(panel.getByRole("img", { name: "Pendiente" }))
      .toBeVisible();
    await expect.element(composer).toHaveValue("");
  });

  it("sends with Ctrl+Enter", async () => {
    const { panel } = await openConversation("user", "Rosa Pizarro");
    const composer = panel.getByRole("textbox", { name: "Escribe un mensaje" });

    await composer.fill("¿Le acomoda una visita el jueves?");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");

    await expect
      .element(panel.getByText("¿Le acomoda una visita el jueves?"))
      .toBeVisible();
    await expect.element(composer).toHaveValue("");
  });

  it("disables everything while sending, so a second click sends nothing", async () => {
    let release = () => {};
    const sendWaMessage = vi.fn(
      () =>
        new Promise<never>((_, reject) => {
          release = () => reject(new Error("network"));
        }),
    );
    const screen = await render(
      <WhatsAppInbox role="user" dataProvider={{ sendWaMessage }} />,
    );
    await screen.getByRole("button", { name: /^Rosa Pizarro/ }).click();
    const panel = screen.getByRole("region", { name: "Rosa Pizarro" });
    const composer = panel.getByRole("textbox", { name: "Escribe un mensaje" });

    await composer.fill("Hola");
    await panel.getByRole("button", { name: "Enviar" }).click();

    await expect.element(composer).toBeDisabled();
    await expect
      .element(panel.getByRole("button", { name: "Enviar" }))
      .toBeDisabled();
    release();
    await expect.element(composer).toBeEnabled();
    expect(sendWaMessage).toHaveBeenCalledTimes(1);
  });

  it("keeps an unassigned chat read-only until someone takes it", async () => {
    const { panel } = await openConversation(
      "admin",
      "+56900000003",
      "Sin asignar",
    );

    await expect
      .element(panel.getByRole("textbox", { name: "Escribe un mensaje" }))
      .toBeDisabled();
    await expect
      .element(panel.getByRole("button", { name: "Enviar" }))
      .toBeDisabled();
  });

  it("keeps an archived chat read-only, even for its executive", async () => {
    const screen = await render(<ArchivedChatPanel />);
    const panel = screen.getByRole("region", { name: "Rosa Pizarro" });

    await expect.element(panel.getByText("<b>hola</b><script>")).toBeVisible();
    await expect
      .element(panel.getByRole("textbox", { name: "Escribe un mensaje" }))
      .toBeDisabled();
    await expect
      .element(panel.getByRole("button", { name: "Enviar" }))
      .toBeDisabled();
  });

  it("lets a manager write in another executive's chat", async () => {
    const { panel } = await openConversation("admin", "Andrés Vega", "Todos");

    await expect
      .element(panel.getByRole("textbox", { name: "Escribe un mensaje" }))
      .toBeEnabled();
  });

  it("lists only the active quick replies, by title", async () => {
    const { screen, panel } = await openConversation("user", "Rosa Pizarro");

    await panel.getByRole("button", { name: "Respuestas rápidas" }).click();

    const picker = screen.getByRole("dialog", { name: "Respuestas rápidas" });
    await expect.element(picker.getByText("Saludo")).toBeVisible();
    const titles = picker
      .getByRole("listitem")
      .elements()
      .map((item) => item.querySelector("span")?.textContent);
    expect(titles).toEqual(["Ficha técnica", "Saludo"]);
    expect(picker.getByText("Despedida antigua").elements()).toHaveLength(0);
  });

  it("appends a picked quick reply on a new line and returns focus to the composer", async () => {
    const { screen, panel } = await openConversation("user", "Rosa Pizarro");
    const composer = panel.getByRole("textbox", { name: "Escribe un mensaje" });
    await composer.fill("Buenos días.");

    await panel.getByRole("button", { name: "Respuestas rápidas" }).click();
    await screen.getByRole("button", { name: /^Ficha técnica/ }).click();

    await expect
      .element(composer)
      .toHaveValue("Buenos días.\nLe adjunto la ficha técnica del producto.");
    await expect.element(composer).toHaveFocus();
    await expect
      .element(screen.getByRole("dialog", { name: "Respuestas rápidas" }))
      .not.toBeInTheDocument();
  });

  it("keeps quick replies disabled where the composer is", async () => {
    const screen = await render(<ArchivedChatPanel />);
    const panel = screen.getByRole("region", { name: "Rosa Pizarro" });

    await expect
      .element(panel.getByRole("button", { name: "Respuestas rápidas" }))
      .toBeDisabled();
  });

  it("explains in Spanish when the base refuses the message, and keeps the text", async () => {
    const sendWaMessage = async () => {
      throw Object.assign(new Error("rate limit"), { code: "PT429" });
    };
    const screen = await render(
      <WhatsAppInbox role="user" dataProvider={{ sendWaMessage }} />,
    );
    await screen.getByRole("button", { name: /^Rosa Pizarro/ }).click();
    const panel = screen.getByRole("region", { name: "Rosa Pizarro" });
    const composer = panel.getByRole("textbox", { name: "Escribe un mensaje" });

    await composer.fill("Hola de nuevo");
    await panel.getByRole("button", { name: "Enviar" }).click();

    await expect
      .element(
        screen.getByText(
          "Enviaste demasiados mensajes seguidos. Espera un minuto y vuelve a intentarlo.",
        ),
      )
      .toBeVisible();
    await expect.element(composer).toHaveValue("Hola de nuevo");
  });
});
