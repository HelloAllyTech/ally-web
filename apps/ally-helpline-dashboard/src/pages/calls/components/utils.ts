import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { TFunction } from "i18next";

import { ErrorIcon } from "@assets";
import { ChipConfig } from "@components";
import { CallProvider, ScribeSessionMode } from "@constants";
import { ChatSummaryStatus } from "@types";

export const getStatusChipConfig = (status: ChatSummaryStatus, t: TFunction): ChipConfig => {
  switch (status) {
    case ChatSummaryStatus.PENDING:
    case ChatSummaryStatus.IN_PROGRESS:
      return {
        label: t("calls.status.processing"),
        outerDivClassName: "bg-status-ochreBg",
        dotClassName: "bg-status-ochreDot",
      };
    case ChatSummaryStatus.SUCCESS:
      return {
        label: t("calls.status.generated"),
        dotClassName: "bg-status-sageDot",
        outerDivClassName: "bg-status-sageBg",
      };
    case ChatSummaryStatus.FAILED:
      return {
        label: t("calls.status.error"),
        dotClassName: "bg-status-alarmDot",
        outerDivClassName: "bg-status-alarmBg",
      };
    case ChatSummaryStatus.NO_AUDIO:
      return {
        label: t("calls.status.noAudio"),
        icon: ErrorIcon,
      };
    default:
      return {
        label: t("calls.status.unknown"),
        dotClassName: "bg-status-sandDot",
        outerDivClassName: "bg-status-sandBg",
      };
  }
};

export const getSourceChipConfig = (provider: CallProvider, t: TFunction): ChipConfig => {
  switch (provider) {
    case CallProvider.AUDIO_UPLOAD:
      return {
        label: t("calls.source.uploaded"),
        dotClassName: "hidden",
        outerDivClassName: "bg-status-sandBg text-status-sandFg",
      };
    default:
      return {
        label: t("calls.source.liveSession"),
        dotClassName: "hidden",
        outerDivClassName: "bg-status-clayBg text-status-clayFg",
      };
  }
};

export const getModeChipConfig = (mode: string | undefined | null, t: TFunction): ChipConfig => {
  switch (mode) {
    case ScribeSessionMode.DICTATION:
      return {
        label: t("calls.mode.dictation"),
        dotClassName: "hidden",
        outerDivClassName: "bg-status-ochreBg text-status-ochreFg",
      };
    case ScribeSessionMode.SCRIBE:
    default:
      return {
        label: t("calls.mode.scribe"),
        dotClassName: "hidden",
        outerDivClassName: "bg-status-mauveBg text-status-mauveFg",
      };
  }
};

// Ensure required dayjs plugins are active for timezone-aware logic
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Returns the maximum selectable time for a given date considering the provided timezone.
 * - If the date (in tz) is today: returns the current time in that timezone.
 * - If the date (in tz) is in the past: returns null (no max constraint).
 * - If the date (in tz) is in the future: returns start of day in that timezone (effectively disallowing selection).
 */
export const getMaxSelectableTimeForDate = (
  timezoneId: string | null | undefined,
  date: Dayjs | null,
): Dayjs | null => {
  if (!timezoneId || !date || !date.isValid()) return null;

  const nowInTz = dayjs().tz(timezoneId);
  const selectedDateInTz = dayjs.tz(date.format("YYYY-MM-DD"), "YYYY-MM-DD", timezoneId);

  if (selectedDateInTz.isAfter(nowInTz, "day")) {
    // Future date: disallow selection by constraining to SOD
    return selectedDateInTz.startOf("day");
  }

  if (selectedDateInTz.isBefore(nowInTz, "day")) {
    // Past date: no max time constraint
    return null;
  }

  // Today in timezone: cap at current time in tz
  return nowInTz;
};

export type DenormalizedCustomFieldValue = {
  fieldDefinitionId: string;
  value?: string | null;
};

/**
 * The calls/logs tables accumulate paginated rows in local React state rather
 * than rendering straight off the RTK cache. Merge a freshly fetched page into
 * the accumulated list keyed by row id: existing rows are replaced in place
 * (position preserved), genuinely new rows are appended. This replaces the old
 * blind append, which duplicated rows on refetch and left an edited row's stale
 * copy in place until a full reload reset pagination to offset 0. Idempotent.
 */
export const reconcileLogsById = <T extends { id: number }>(prev: T[], incoming: T[]): T[] => {
  if (incoming.length === 0) return prev;
  const byId = new Map<number, T>(prev.map(row => [row.id, row]));
  incoming.forEach(row => byId.set(row.id, row));
  return Array.from(byId.values());
};

/**
 * Patch a single row's denormalized `customFieldValues` after an in-place edit,
 * so the table cell updates immediately without waiting for a list refetch
 * (which only covers the currently-subscribed page). Changed fields are
 * upserted by `fieldDefinitionId`.
 */
export const patchRowCustomFieldValues = <
  T extends { id: number; customFieldValues?: DenormalizedCustomFieldValue[] },
>(
  logs: T[],
  chatId: number,
  changed: DenormalizedCustomFieldValue[],
): T[] =>
  logs.map(row => {
    if (row.id !== chatId) return row;
    const byField = new Map<string, DenormalizedCustomFieldValue>(
      (row.customFieldValues ?? []).map(v => [v.fieldDefinitionId, v]),
    );
    changed.forEach(v => byField.set(v.fieldDefinitionId, v));
    return { ...row, customFieldValues: Array.from(byField.values()) };
  });

/**
 * Filter options for the roleplay logs' Counsellor column.
 *
 * Display names are not unique within a tenant: production has three separate
 * accounts named "Sandeep Malhotra", plus two more duplicated names. Rendering
 * those as identical rows gave an admin no way to tell which person they were
 * picking — the value is the user id, so the two rows select genuinely
 * different sessions while reading exactly the same.
 *
 * The email is appended only to the names that actually repeat. Disambiguating
 * every row would put an address beside thirty names that never needed one, and
 * the name is what an admin is scanning for.
 */
export const buildCounsellorFilterOptions = (
  counselors: { id: number; name: string; email?: string }[],
): { label: string; value: string }[] => {
  const timesSeen = counselors.reduce<Record<string, number>>((acc, c) => {
    acc[c.name] = (acc[c.name] ?? 0) + 1;
    return acc;
  }, {});

  return counselors.map(c => ({
    label: timesSeen[c.name] > 1 && c.email ? `${c.name} (${c.email})` : c.name,
    value: String(c.id),
  }));
};
