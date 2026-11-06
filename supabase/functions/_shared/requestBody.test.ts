// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "npm:zod@^4.3.6";
import { parseJsonBody } from "./requestBody";

const schema = z.strictObject({ name: z.string(), age: z.number().optional() });

const request = (body: string) =>
  new Request("http://localhost/fn", { method: "POST", body });

const errorOf = async (body: string) => {
  const result = await parseJsonBody(request(body), schema);
  if (!("response" in result)) throw new Error("expected a 400");
  return {
    status: result.response.status,
    cors: result.response.headers.get("Access-Control-Allow-Origin"),
    json: await result.response.json(),
  };
};

describe("parseJsonBody", () => {
  it("returns the validated data for a valid body", async () => {
    const result = await parseJsonBody(request('{"name":"Ana"}'), schema);
    expect(result).toEqual({ data: { name: "Ana" } });
  });

  it("answers 400 with CORS headers when the body is not JSON", async () => {
    const error = await errorOf("{not json");
    expect(error.status).toBe(400);
    expect(error.cors).toBe("*");
    expect(error.json).toMatchObject({ code: "invalid_body", field: "body" });
  });

  it("names the missing field", async () => {
    const error = await errorOf("{}");
    expect(error.status).toBe(400);
    expect(error.json.field).toBe("name");
  });

  it("rejects an unknown field and names it", async () => {
    const error = await errorOf('{"name":"Ana","is_admin":true}');
    expect(error.json.field).toBe("is_admin");
  });

  it("does not echo the value it rejected", async () => {
    const error = await errorOf('{"name":{"x":"secreto-123"}}');
    expect(error.json.field).toBe("name");
    expect(JSON.stringify(error.json)).not.toContain("secreto-123");
  });
});
