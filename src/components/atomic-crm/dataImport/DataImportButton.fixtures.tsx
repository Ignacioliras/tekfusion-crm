import { StoryWrapper } from "@/test/StoryWrapper";
import { DataImportButton } from "./DataImportButton";
import type { ImportableResourceName } from "./useImportableResources";

export const AllResources = () => (
  <StoryWrapper>
    <DataImportButton />
  </StoryWrapper>
);

export const SingleResource = ({
  resource,
}: {
  resource: ImportableResourceName;
}) => (
  <StoryWrapper>
    <DataImportButton resource={resource} />
  </StoryWrapper>
);
