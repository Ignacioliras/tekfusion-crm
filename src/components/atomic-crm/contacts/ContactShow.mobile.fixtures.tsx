import { ContactShow } from "./ContactShow";

import { StoryWrapper, buildContact } from "@/test/StoryWrapper";

const successContacts = [
  buildContact({
    first_name: "Ada",
    id: 1,
    last_name: "Lovelace",
    last_seen: "2025-01-05T10:00:00.000Z",
    title: "CTO",
  }),
];

export const MobileSuccess = () => (
  <StoryWrapper data={{ contacts: successContacts }}>
    <ContactShow resource="contacts" id={1} />
  </StoryWrapper>
);
