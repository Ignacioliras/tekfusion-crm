import { sql } from "https://esm.sh/kysely@0.27.2";
import { db } from "./db.ts";

// Returns the files of the attachments bucket that no row uses anymore, among
// the given ones. Shared by delete_note_attachments (a note dropped a file) and
// purge-orphan-attachments (daily sweep), so there is ONE list of references.
//
// A file counts as used when its number (`0.8262106278726917` for
// `deals/12/0.8262106278726917.pdf`) appears anywhere in one of the columns
// listed in `refs`. We search for the number only, because the extension may
// be URL-encoded in a stored URL. A name without such a number is never
// returned: it cannot be checked, so it is kept.
//
// Every column that can hold uploaded files MUST be listed in `refs` (AGENTS.md,
// "Adding Custom Fields", step 10). Otherwise, a file used both by a note and by
// that column gets deleted when the note drops it, or by the daily purge.
export const getUnreferencedNames = async (
  names: string[],
): Promise<string[]> => {
  if (names.length === 0) return [];
  const { rows } = await sql<{ name: string }>`
    with candidates as (
      select name, substring(name from '(0\\.[0-9]+)[^/]*$') as stem
      from jsonb_array_elements_text(${JSON.stringify(names)}::jsonb) as name
    ),
    refs as (
      select attachments::text as text from public.contact_notes
      union all select attachments::text from public.deal_notes
      union all select logo::text from public.companies
      union all select avatar::text from public.contacts
      union all select avatar::text from public.sales
      union all select config::text from public.configuration
      union all select pdf_path from public.quotes
      union all select attachment_path from public.wa_messages where attachment_path is not null
    )
    select c.name
    from candidates c
    where c.stem is not null
      and not exists (
        select 1 from refs where strpos(refs.text, c.stem) > 0
      )
  `.execute(db);

  return rows.map((row) => row.name);
};
