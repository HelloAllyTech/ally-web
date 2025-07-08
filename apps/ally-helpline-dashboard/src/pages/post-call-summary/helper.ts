import { format } from "date-fns";

import { SummaryFieldKey } from "@/types/summary";

import { postCallSectionOrder, summaryFields } from "./constants";
import { SectionType, SummarySectionKey } from "./types";

export const getFormattedDateTime = (dateTime: string, formatString: string) => {
  if (!dateTime) return "--";
  const date = new Date(dateTime);
  return format(date, formatString);
};

export const getSectionFields = (section: SummarySectionKey, visibleFields: SummaryFieldKey[]) => {
  return summaryFields.filter(
    field => field.sectionKey === section && visibleFields?.includes(field.key),
  );
};

export const getNextSection = (section: SectionType) => {
  const index = postCallSectionOrder.indexOf(section);
  return postCallSectionOrder[index + 1];
};
