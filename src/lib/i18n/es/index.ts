import { mergeTranslations } from "ra-core";
import type { PartialCrmMessages } from "@/components/atomic-crm/providers/commons/englishCrmMessages";
import { commonMessages } from "./common";
import { companiesMessages } from "./companies";
import { contactsMessages } from "./contacts";
import { dashboardMessages } from "./dashboard";
import { dealsMessages } from "./deals";
import { notesMessages } from "./notes";
import { settingsMessages } from "./settings";
import { tagsMessages } from "./tags";
import { tasksMessages } from "./tasks";

export { raMessages as spanishMessages } from "./ra";

// Spanish (Chile) translation of Atomic's own keys (englishCrmMessages.ts),
// one file per module. Each file is typed against the English catalog, so a
// misspelled key fails typecheck; missing keys fall back to English.
// Vocabulary: a deal is a "lead"; a sale (account manager) is an "ejecutivo".
export const spanishCrmMessages: PartialCrmMessages = mergeTranslations(
  commonMessages,
  companiesMessages,
  contactsMessages,
  dashboardMessages,
  dealsMessages,
  notesMessages,
  settingsMessages,
  tagsMessages,
  tasksMessages,
);
