import { TFunction } from "i18next";

/**
 * Filter options + param mapping for the built-in call-log columns (Date,
 * Duration, Mode, Tags, Status, Channel). Values sent to the API match the
 * display groups the backend understands (see applyModeStatusSourceFilters).
 */

export const getModeFilterOptions = (t: TFunction) => [
  { label: t("calls.mode.scribe", "Scribe"), value: "SCRIBE" },
  { label: t("calls.mode.dictation", "Dictation"), value: "DICTATION" },
];

export const getStatusFilterOptions = (t: TFunction) => [
  { label: t("calls.status.generated", "Generated"), value: "SUCCESS" },
  { label: t("calls.status.processing", "Processing"), value: "PROCESSING" },
  { label: t("calls.status.error", "Error"), value: "FAILED" },
  { label: t("calls.status.noAudio", "No Audio"), value: "NO_AUDIO" },
];

export const getChannelFilterOptions = (t: TFunction) => [
  { label: t("calls.source.liveSession", "Live Session"), value: "LIVE" },
  { label: t("calls.source.uploaded", "Uploaded"), value: "UPLOAD" },
];

export interface BuiltinFilterParams {
  startDate?: string;
  endDate?: string;
  minDuration?: number;
  maxDuration?: number;
  tags?: string;
  mode?: string;
  status?: string;
  source?: string;
}

type FilterEntry = { key: string; value: string | string[] };

/**
 * Maps the generic-table filter entries for the built-in columns into API
 * query params. Duration is entered in minutes and converted to seconds (the
 * backend column unit). The duration column key differs between the tables
 * ("duration" in the user view, "callDuration" in the admin view), so both are
 * accepted.
 */
export function buildBuiltinFilterParams(filter: FilterEntry[]): BuiltinFilterParams {
  const params: BuiltinFilterParams = {};
  const valueOf = (key: string) => filter.find(f => f.key === key)?.value;

  const date = valueOf("dateAndTime");
  if (Array.isArray(date)) {
    if (date[0]) params.startDate = date[0];
    if (date[1]) params.endDate = date[1];
  }

  const duration = valueOf("duration") ?? valueOf("callDuration");
  if (Array.isArray(duration)) {
    const [min, max] = duration;
    if (min && min.trim() !== "") params.minDuration = Number(min) * 60;
    if (max && max.trim() !== "") params.maxDuration = Number(max) * 60;
  }

  const asCsv = (key: string) => {
    const v = valueOf(key);
    return Array.isArray(v) && v.length > 0 ? v.join(",") : undefined;
  };

  params.mode = asCsv("mode");
  params.status = asCsv("summaryStatus");
  params.source = asCsv("source");
  params.tags = asCsv("tags");

  return params;
}
