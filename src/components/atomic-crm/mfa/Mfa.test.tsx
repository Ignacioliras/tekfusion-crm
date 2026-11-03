import { render } from "vitest-browser-react";
import { StoryWrapper } from "@/test/StoryWrapper";
import { createFakeMfaApi, FAKE_MFA_CODE } from "@/test/fakeMfaApi";
import { DEFAULT_USER } from "@/components/atomic-crm/providers/fakerest/authProvider";

import { MFA_ROUTES } from "./mfaApi";

// Two-step verification (TOTP): enrolling from Configuración → Mi perfil and
// verifying at login, against an in-memory stand-in of supabase-js auth.mfa.

const identityWithRole = (role: "manager" | "executive") => async () => ({
  id: DEFAULT_USER.id,
  fullName: `${DEFAULT_USER.first_name} ${DEFAULT_USER.last_name}`,
  role,
});

describe("two-step verification", () => {
  it("lets an executive enable it from the profile: QR code, wrong code, right code", async () => {
    const mfa = createFakeMfaApi();
    const screen = await render(
      <StoryWrapper
        initialEntries={["/profile"]}
        authProvider={{
          getMfaApi: () => mfa,
          getIdentity: identityWithRole("executive"),
        }}
      >
        {null}
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Not enabled")).toBeVisible();
    await screen.getByRole("button", { name: "Enable" }).click();
    await expect
      .element(screen.getByRole("img", { name: "QR code" }))
      .toBeVisible();
    await expect.element(screen.getByText("JBSWY3DPEHPK3PXP")).toBeVisible();

    await screen.getByLabelText("6-digit code").fill("000000");
    await screen.getByRole("button", { name: "Confirm" }).click();
    await expect
      .element(screen.getByText("Wrong code. Try again."))
      .toBeVisible();

    await screen.getByLabelText("6-digit code").fill(FAKE_MFA_CODE);
    await screen.getByRole("button", { name: "Confirm" }).click();
    await expect.element(screen.getByText("Enabled")).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Disable" }))
      .toBeVisible();
  });

  it("gives a manager no way to disable it", async () => {
    const screen = await render(
      <StoryWrapper
        initialEntries={["/profile"]}
        authProvider={{
          getMfaApi: () => createFakeMfaApi({ verified: true }),
          getIdentity: identityWithRole("manager"),
        }}
      >
        {null}
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Enabled")).toBeVisible();
    await expect
      .element(screen.getByText("Required for management."))
      .toBeVisible();
    expect(
      screen.getByRole("button", { name: "Disable" }).elements(),
    ).toHaveLength(0);
  });

  it("verifies the code at login and goes on to the CRM", async () => {
    const screen = await render(
      <StoryWrapper
        initialEntries={[MFA_ROUTES.verify]}
        authProvider={{ getMfaApi: () => createFakeMfaApi({ verified: true }) }}
      >
        <span>dashboard listo</span>
      </StoryWrapper>,
    );

    await screen.getByLabelText("6-digit code").fill("999999");
    await screen.getByRole("button", { name: "Sign in" }).click();
    await expect
      .element(screen.getByText("Wrong code. Try again."))
      .toBeVisible();

    await screen.getByLabelText("6-digit code").fill(FAKE_MFA_CODE);
    await screen.getByRole("button", { name: "Sign in" }).click();
    await expect.element(screen.getByText("dashboard listo")).toBeVisible();
  });
});
