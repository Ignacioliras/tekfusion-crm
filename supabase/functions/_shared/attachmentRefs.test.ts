import { describe, expect, it } from "vitest";
import pgTapTest from "../../tests/40_attachment_refs.test.sql?raw";
import source from "./attachmentRefs.ts?raw";

// The reference query decides which files get DELETED and only runs inside
// Deno against Postgres, so its behaviour is tested in pgTAP
// (supabase/tests/40_attachment_refs.test.sql) on a literal copy. This test
// keeps the copy honest: change the query and the pgTAP must change with it.
const squash = (sql: string): string => sql.replace(/\s+/g, " ").trim();

describe("attachmentRefs query", () => {
  it("is the same query the pgTAP test 40_attachment_refs runs", () => {
    const [, template] = /sql<[^>]*>`([\s\S]*?)`\.execute/.exec(source) ?? [];
    const [, tested] = /\$query\$([\s\S]*?)\$query\$/.exec(pgTapTest) ?? [];
    expect(template).toBeTruthy();

    // What Postgres receives: the template's escapes cooked and the kysely
    // parameter as $1.
    const sent = template
      .replace("${JSON.stringify(names)}", "$1")
      .replaceAll("\\\\", "\\");
    expect(squash(tested ?? "")).toBe(squash(sent));
  });
});
