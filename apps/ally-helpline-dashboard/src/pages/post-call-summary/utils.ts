import { SummaryFieldKey } from "@types";

import {
  DeeplinkSourceValue,
  postCallSectionOrder,
  SectionQueryKey,
  SourceQueryKey,
  summaryFields,
} from "./constants";
import { SectionType, SummarySectionKey, SummaryField } from "./types";

export const getSectionFields = (
  section: SummarySectionKey,
  visibleFields: SummaryFieldKey[],
  allFields: SummaryField[] = summaryFields,
) => {
  return allFields.filter(
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

export const getSelectedSection = (searchParams: URLSearchParams) => {
  if (isSourceDeeplink(searchParams)) return "2";
  if (searchParams.get(SectionQueryKey)) return searchParams.get(SectionQueryKey);
  return "1";
};

export const isSourceDeeplink = (searchParams: URLSearchParams) =>
  searchParams.get(SourceQueryKey) === DeeplinkSourceValue;
