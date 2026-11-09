import { describe, expect, it } from "vitest";
import { reportError, scrubEvent } from "./sentry";
import { createHandler } from "../whatsapp-webhook/handler";

// Fake JWT: three base64url segments, no real signature.
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcDEF123_-xyz";

describe("scrubEvent", () => {
  it.each([
    ["an email", "falló con ficticio.perez@example.cl", "[email]"],
    ["an E.164 phone", "cliente +56912345678 sin lead", "[phone]"],
    ["a Chilean mobile without prefix", "tel 912345678 ok", "[phone]"],
    ["a Chilean landline with 56", "tel 56223456789 ok", "[phone]"],
    ["a WhatsApp jid", "jid 56912345678@s.whatsapp.net", "[email]"],
    ["a Bearer token", "auth Bearer abc.DEF-123_xyz", "Bearer [token]"],
    ["a JWT", `jwt ${JWT} end`, "[token]"],
    ["an apikey pair", "apikey=secreto-123 fin", "apikey=[token]"],
    ["a json apikey", '{"apikey": "secreto-123"}', '{"apikey": "[token]"}'],
  ])("removes %s from the message", (_, message, expected) => {
    const event = scrubEvent({ message });

    expect(event.message).toContain(expected);
    expect(event.message).not.toMatch(/ficticio|9123|2345|secreto|eyJ|abc\./);
  });

  it("scrubs exception, extra, contexts and request headers, keeping the rest", () => {
    const input = {
      message: "rpc failed",
      exception: {
        values: [
          { type: "Error", value: `duplicate +56912345678 for a@example.cl` },
        ],
      },
      extra: { rpc: "wa_ingest_message", phone: "+56 9 1234 5678" },
      contexts: { payload: { from: "56912345678", nested: [JWT] } },
      request: {
        url: "https://crm.ficticio.test/functions/v1/users",
        headers: {
          Authorization: `Bearer ${JWT}`,
          apikey: "clave-sin-forma-reconocible",
          "x-forwarded-for": "10.0.0.1",
        },
      },
      level: "error",
    };

    const event = scrubEvent(input);

    expect(event.exception.values[0].value).toBe(
      "duplicate [phone] for [email]",
    );
    expect(event.extra).toEqual({ rpc: "wa_ingest_message", phone: "[phone]" });
    expect(event.contexts).toEqual({
      payload: { from: "[phone]", nested: ["[token]"] },
    });
    expect(event.request.headers).toEqual({
      Authorization: "[token]",
      apikey: "[token]",
      "x-forwarded-for": "10.0.0.1",
    });
    expect(event.request.url).toBe(input.request.url);
    expect(event.level).toBe("error");
    expect(JSON.stringify(event)).not.toMatch(/5678|example\.cl|eyJ|clave/);
  });

  it("does not mutate the event it receives", () => {
    const input = { message: "a@example.cl", extra: { tel: "+56912345678" } };
    const copy = structuredClone(input);

    scrubEvent(input);

    expect(input).toEqual(copy);
  });
});

describe("reportError", () => {
  it("resolves without throwing when there is no DSN", async () => {
    await expect(
      reportError(new Error("boom"), { function: "test" }),
    ).resolves.toBeUndefined();
    await expect(reportError({ message: "not an Error" })).resolves.toBe(
      undefined,
    );
  });
});

describe("whatsapp-webhook handler reports caught errors", () => {
  const SECRET = "secreto-de-prueba-123"; // gitleaks:allow (dato de prueba)
  const body = {
    event: "messages.update",
    instance: "tekfusion-staging",
    data: { keyId: "3EB0FICTICIO0001", status: "READ" },
  };
  const post = () =>
    new Request("http://localhost/whatsapp-webhook", {
      method: "POST",
      headers: { apikey: SECRET },
      body: JSON.stringify(body),
    });

  it("calls report with the rpc error and name when answering 503", async () => {
    const dbError = { message: "connection refused" };
    const reported: unknown[][] = [];
    const handler = createHandler({
      secret: SECRET,
      rpc: async () => ({ error: dbError }),
      log: () => {},
      report: async (...args) => {
        reported.push(args);
      },
    });

    const res = await handler(post());

    expect(res.status).toBe(503);
    expect(reported).toEqual([[dbError, { rpc: "wa_update_message_status" }]]);
  });

  it("calls report when the rpc throws", async () => {
    const thrown = new Error("network down");
    const reported: unknown[] = [];
    const handler = createHandler({
      secret: SECRET,
      rpc: async () => {
        throw thrown;
      },
      log: () => {},
      report: async (error) => {
        reported.push(error);
      },
    });

    const res = await handler(post());

    expect(res.status).toBe(503);
    expect(reported).toEqual([thrown]);
  });

  it("does not report a successful call", async () => {
    const reported: unknown[] = [];
    const handler = createHandler({
      secret: SECRET,
      rpc: async () => ({ error: null }),
      log: () => {},
      report: async (error) => {
        reported.push(error);
      },
    });

    const res = await handler(post());

    expect(res.status).toBe(200);
    expect(reported).toEqual([]);
  });
});
