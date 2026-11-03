import { mergeTranslations } from "ra-core";
import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";
import { authMessages, raSupabaseMessages } from "./auth";
import { commonMessages } from "./common";
import { companiesMessages } from "./companies";
import { contactsMessages } from "./contacts";
import { dashboardMessages } from "./dashboard";
import { dealsMessages } from "./deals";
import { importMessages } from "./import";
import { notesMessages } from "./notes";
import { searchMessages } from "./search";
import { settingsMessages } from "./settings";
import { tagsMessages } from "./tags";
import { tasksMessages } from "./tasks";

import { raMessages } from "./ra";

// Spanish (Chile) translation of Atomic's own keys (englishCrmMessages.ts),
// one file per module. Each file is typed against the English catalog, so a
// misspelled key fails typecheck; missing keys fall back to English.
// Vocabulary: a deal is a "lead"; a sale (account manager) is an "ejecutivo".
export const spanishCrmMessages: PartialCrmMessages = mergeTranslations(
  authMessages,
  commonMessages,
  companiesMessages,
  contactsMessages,
  dashboardMessages,
  dealsMessages,
  importMessages,
  notesMessages,
  searchMessages,
  settingsMessages,
  tagsMessages,
  tasksMessages,
);

// Spanish for the react-admin and ra-supabase keys.
export const spanishMessages = mergeTranslations(raMessages, raSupabaseMessages);
