import { format } from "date-fns";

import { SummaryFieldKey } from "@/types/summary";

import { summaryFields } from "./constants";
import { SummarySectionKey } from "./types";

export const getFormattedDateTime = (dateTime: string, formatString: string) => {
  if (!dateTime) return "--";
  const date = new Date(dateTime);
  return format(date, formatString);
};

export const getSectionFields = (section: SummarySectionKey, visibleFields: SummaryFieldKey[]) => {
  return summaryFields.filter((field) => 
    field.sectionKey === section && visibleFields?.includes(field.key)
  );
};
