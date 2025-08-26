import { format } from "date-fns";

import { SummaryFieldKey } from "@types";

import { postCallSectionOrder, summaryFields } from "./constants";
import { SectionType, SummarySectionKey } from "./types";

export const getSectionFields = (section: SummarySectionKey, visibleFields: SummaryFieldKey[]) => {
  return summaryFields.filter(
    field => field.sectionKey === section && visibleFields?.includes(field.key),
  );
};

export const getNextSection = (section: SectionType) => {
  const index = postCallSectionOrder.indexOf(section);
  return postCallSectionOrder[index + 1];
};

export const getSectionTabForIndex = (order: number) => postCallSectionOrder[order - 1] ?? null;

export const getNumberForSectionKey = (section: SectionType) =>
  postCallSectionOrder.indexOf(section) + 1;
