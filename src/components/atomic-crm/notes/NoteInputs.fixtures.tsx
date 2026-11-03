import { Form } from "ra-core";

import { NoteInputs } from "./NoteInputs";
import { SaveButton } from "@/components/admin/form";
import { StoryWrapper } from "@/test/StoryWrapper";

type NoteInputsStoryProps = React.ComponentProps<typeof NoteInputs> & {
  defaultValues?: Record<string, unknown>;
  withSaveButton?: boolean;
};

export const NoteInputsStory = ({
  defaultValues,
  withSaveButton = false,
  ...props
}: NoteInputsStoryProps) => (
  <StoryWrapper>
    <Form defaultValues={defaultValues}>
      <NoteInputs {...props} />
      {withSaveButton ? <SaveButton type="button" /> : null}
    </Form>
  </StoryWrapper>
);

export const Default = () => <NoteInputsStory />;

export const WithSaveButton = () => (
  <NoteInputsStory
    {...{
      withSaveButton: true,
    }}
  />
);

export const WithAttachmentDefault = () => (
  <NoteInputsStory
    {...{
      defaultValues: {
        attachments: [{ src: "blob:test", title: "evidence.pdf" }],
      },
      withSaveButton: true,
    }}
  />
);
