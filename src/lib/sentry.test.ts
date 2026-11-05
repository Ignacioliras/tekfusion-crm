import * as Sentry from "@sentry/react";
import { describe, expect, it } from "vitest";

import { initSentry } from "./sentry";

const TEST_DSN = "https://publickey@o0.ingest.sentry.io/0";

describe("initSentry", () => {
  it("does not initialize when the DSN is empty or missing", () => {
    expect(initSentry("")).toBe(false);
    expect(initSentry("   ")).toBe(false);
    expect(initSentry(undefined)).toBe(false);
    expect(Sentry.getClient()).toBeUndefined();
  });

  it("initializes with a DSN and strips cookies, headers, email and ip before sending", async () => {
    expect(initSentry(TEST_DSN)).toBe(true);

    const options = Sentry.getClient()?.getOptions();
    expect(options?.dataCollection?.userInfo).toBe(false);
    expect(options?.tracesSampleRate).toBe(0);

    const beforeSend = options?.beforeSend;
    expect(beforeSend).toBeDefined();
    const event = await beforeSend!(
      {
        type: undefined,
        message: "boom",
        request: {
          url: "https://crm.example.cl/deals/1",
          cookies: { session: "abc" },
          headers: { Authorization: "Bearer xyz" },
        },
        user: { id: "42", email: "ficticio@example.cl", ip_address: "10.0.0.1" },
      },
      {},
    );

    expect(event?.message).toBe("boom");
    expect(event?.request?.url).toBe("https://crm.example.cl/deals/1");
    expect(event?.request?.cookies).toBeUndefined();
    expect(event?.request?.headers).toBeUndefined();
    expect(event?.user?.id).toBe("42");
    expect(event?.user?.email).toBeUndefined();
    expect(event?.user?.ip_address).toBeUndefined();
  });
});
