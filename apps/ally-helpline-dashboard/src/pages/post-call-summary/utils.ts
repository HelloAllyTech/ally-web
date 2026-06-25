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

/**
 * Whether the counsellor's edited `summaryData` differs from the original
 * generated summary. Drives both the Save button's enabled state and whether
 * handleSave actually persists.
 *
 * A failed/timed-out session has NO original summary to diff against — in that
 * case any value the counsellor has entered counts as a change, so a manually
 * filled report can be saved. (Previously this returned false whenever there
 * was no original summary, which made FAILED sessions impossible to save.)
 */
export const summaryHasChanges = (
  originalSummary: ({ tags?: { tag: string }[] } & Record<string, unknown>) | null | undefined,
  summaryData: Record<string, unknown> | null | undefined,
): boolean => {
  if (!summaryData) {
    return false;
  }

  if (!originalSummary) {
    return Object.entries(summaryData).some(([key, value]) =>
      key === "tags" ? Boolean(value) : value !== undefined && value !== null && value !== "",
    );
  }

  const originalFormattedTags = originalSummary.tags?.map(({ tag }) => tag).join(", ");
  const originalData: Record<string, unknown> = {
    ...originalSummary,
    tags: originalFormattedTags,
  };

  const originalKeys = Object.keys(originalData);
  if (originalKeys.length !== Object.keys(summaryData).length) {
    return true;
  }
  return originalKeys.some(key => originalData[key] !== summaryData[key]);
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
