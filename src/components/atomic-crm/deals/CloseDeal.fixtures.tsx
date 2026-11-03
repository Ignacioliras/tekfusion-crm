import { ResourceContextProvider } from "ra-core";

import { StoryWrapper } from "@/test/StoryWrapper";
import DealList from "./DealList";
import { leadFileData } from "./LeadFile.fixtures";

/** The pipeline with one quoted lead and the lost reasons. */
export const PipelineWithQuotedLead = () => (
  <StoryWrapper data={leadFileData()}>
    <ResourceContextProvider value="deals">
      <DealList />
    </ResourceContextProvider>
  </StoryWrapper>
);
