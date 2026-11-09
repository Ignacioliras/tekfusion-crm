import { describe, it, expect } from "vitest";
import { createHandler, MIN_AGE_MS } from "./handler";

const SERVICE_ROLE_KEY = "clave-service-role-de-prueba"; // gitleaks:allow (dato de prueba, no es un secreto)
const NOW = new Date("2026-11-09T12:00:00Z");
const hoursAgo = (hours: number): Date =>
  new Date(NOW.getTime() - hours * 60 * 60 * 1000);

interface StoredFile {
  name: string;
  createdAt: Date;
}

// A fake bucket plus a fake reference list: the handler only sees names.
const setup = ({
  files,
  referenced = [],
  removeError,
}: {
  files: StoredFile[];
  referenced?: string[];
  removeError?: Error;
}) => {
  const removed: string[][] = [];
  const logs: unknown[][] = [];
  const handler = createHandler({
    serviceRoleKey: SERVICE_ROLE_KEY,
    listObjectsOlderThan: async (cutoff) =>
      files.filter((f) => f.createdAt < cutoff).map((f) => f.name),
    getUnreferencedNames: async (names) =>
      names.filter((name) => !referenced.includes(name)),
    removeObjects: async (names) => {
      if (removeError) throw removeError;
      removed.push(names);
    },
    log: (...entry) => logs.push(entry),
    now: () => NOW,
  });
  return { handler, removed, logs };
};

const post = (
  body: unknown = undefined,
  authorization: string | null = `Bearer ${SERVICE_ROLE_KEY}`,
): Request =>
  new Request("http://localhost/purge-orphan-attachments", {
    method: "POST",
    headers: authorization === null ? {} : { authorization },
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });

const OLD_ORPHAN = "deals/12/0.8262106278726917.pdf";
const OLD_REFERENCED = "contacts/7/0.111.png";

describe("purge-orphan-attachments handler", () => {
  it("answers 401 without the service role key", async () => {
    const { handler, removed } = setup({
      files: [{ name: OLD_ORPHAN, createdAt: hoursAgo(48) }],
    });

    const missing = await handler(post({ apply: true }, null));
    const anonKey = await handler(post({ apply: true }, "Bearer otra-clave"));
    const empty = await handler(post({ apply: true }, "Bearer "));

    expect([missing.status, anonKey.status, empty.status]).toEqual([
      401, 401, 401,
    ]);
    expect(removed).toHaveLength(0);
  });

  it("answers 405 to anything but POST and 400 to a body it does not know", async () => {
    const { handler, removed } = setup({ files: [] });

    const get = await handler(
      new Request("http://localhost/", {
        method: "GET",
        headers: { authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      }),
    );
    const extraKey = await handler(post({ apply: true, bucket: "quotes" }));
    const notBoolean = await handler(post({ apply: "yes" }));
    const notJson = await handler(post("{apply"));

    expect(get.status).toBe(405);
    expect([extraKey.status, notBoolean.status, notJson.status]).toEqual([
      400, 400, 400,
    ]);
    expect(removed).toHaveLength(0);
  });

  it("dry run by default: counts the old orphan, deletes nothing", async () => {
    const { handler, removed } = setup({
      files: [{ name: OLD_ORPHAN, createdAt: hoursAgo(48) }],
    });

    const noBody = await handler(post());
    const emptyObject = await handler(post({}));
    const explicit = await handler(post({ apply: false }));

    for (const res of [noBody, emptyObject, explicit]) {
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ candidatos: 1, borrados: 0 });
    }
    expect(removed).toHaveLength(0);
  });

  it("apply: deletes the old orphan and only it", async () => {
    const recentOrphan = "deals/12/0.333.pdf";
    const { handler, removed } = setup({
      files: [
        { name: OLD_ORPHAN, createdAt: hoursAgo(48) },
        { name: OLD_REFERENCED, createdAt: hoursAgo(48) },
        { name: recentOrphan, createdAt: hoursAgo(2) },
      ],
      referenced: [OLD_REFERENCED],
    });

    const res = await handler(post({ apply: true }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ candidatos: 1, borrados: 1 });
    expect(removed).toEqual([[OLD_ORPHAN]]);
  });

  it("a file exactly 24 h old is still too young", async () => {
    const { handler, removed } = setup({
      files: [
        { name: OLD_ORPHAN, createdAt: new Date(NOW.getTime() - MIN_AGE_MS) },
      ],
    });

    const res = await handler(post({ apply: true }));

    expect(await res.json()).toEqual({ candidatos: 0, borrados: 0 });
    expect(removed).toHaveLength(0);
  });

  it("never deletes avatars, logos or files outside the note folders", async () => {
    const protectedFiles = [
      "sales/0.444.png",
      "companies/0.555.png",
      "config/0.666.png",
      "0.777.pdf",
      "deals/12/sin-numero.pdf",
    ];
    const { handler, removed } = setup({
      files: protectedFiles.map((name) => ({ name, createdAt: hoursAgo(72) })),
    });

    const res = await handler(post({ apply: true }));

    expect(await res.json()).toEqual({ candidatos: 0, borrados: 0 });
    expect(removed).toHaveLength(0);
  });

  it("ignores names the reference check returns but never asked for", async () => {
    const removed: string[][] = [];
    const handler = createHandler({
      serviceRoleKey: SERVICE_ROLE_KEY,
      listObjectsOlderThan: async () => [OLD_ORPHAN],
      getUnreferencedNames: async () => [OLD_ORPHAN, "sales/0.444.png"],
      removeObjects: async (names) => {
        removed.push(names);
      },
      log: () => {},
      now: () => NOW,
    });

    const res = await handler(post({ apply: true }));

    expect(await res.json()).toEqual({ candidatos: 1, borrados: 1 });
    expect(removed).toEqual([[OLD_ORPHAN]]);
  });

  it("answers 500 and reports when the deletion fails", async () => {
    const reports: unknown[] = [];
    const { handler, logs } = setup({
      files: [{ name: OLD_ORPHAN, createdAt: hoursAgo(48) }],
      removeError: new Error("storage down"),
    });
    const reporting = createHandler({
      serviceRoleKey: SERVICE_ROLE_KEY,
      listObjectsOlderThan: async () => [OLD_ORPHAN],
      getUnreferencedNames: async (names) => names,
      removeObjects: async () => {
        throw new Error("storage down");
      },
      log: () => {},
      report: async (error) => {
        reports.push(error);
      },
      now: () => NOW,
    });

    const res = await handler(post({ apply: true }));
    const reported = await reporting(post({ apply: true }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "purge_failed" });
    expect(logs).toHaveLength(1);
    expect(reported.status).toBe(500);
    expect(reports).toHaveLength(1);
  });
});
