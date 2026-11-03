import { Form } from "ra-core";

import { NoteInputsMobile } from "./NoteInputsMobile";
import { SaveButton } from "@/components/admin/form";
import { StoryWrapper } from "@/test/StoryWrapper";

type NoteInputsMobileStoryProps = React.ComponentProps<
  typeof NoteInputsMobile
> & { defaultValues?: Record<string, unknown> };

export const NoteInputsMobileStory = ({
  defaultValues,
  ...props
}: NoteInputsMobileStoryProps) => (
  <StoryWrapper>
    <Form defaultValues={defaultValues}>
      <NoteInputsMobile {...props} />
      <SaveButton type="button" className="mt-6" />
    </Form>
  </StoryWrapper>
);

export const Default = () => <NoteInputsMobileStory />;

export const WithSelectContact = () => (
  <NoteInputsMobileStory {...{ selectContact: true }} />
);

export const WithAttachmentDefault = () => (
  <NoteInputsMobileStory
    {...{
      defaultValues: {
        attachments: [{ src: "blob:test", title: "evidence.pdf" }],
      },
    }}
  />
);
