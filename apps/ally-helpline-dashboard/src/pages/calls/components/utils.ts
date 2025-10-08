import dayjs, { Dayjs } from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { ErrorIcon } from "@assets";
import { ChipConfig } from "@components";
import { CallProvider } from "@constants";
import { ChatSummaryStatus } from "@types";

export const getStatusChipConfig = (status: ChatSummaryStatus): ChipConfig => {
  switch (status) {
    case ChatSummaryStatus.PENDING:
    case ChatSummaryStatus.IN_PROGRESS:
      return {
        label: "Processing",
        outerDivClassName: "bg-[#F8E6BA]", // Light yellow
        dotClassName: "bg-[#FFAD0D]", // Yellow
      };
    case ChatSummaryStatus.SUCCESS:
      return {
        label: "Generated",
        dotClassName: "bg-[#47B881]", // Green
        outerDivClassName: "bg-[#DCEBDD]", // Light green
      };
    case ChatSummaryStatus.FAILED:
      return {
        label: "Error",
        dotClassName: "bg-[#E5675A]", // Red
        outerDivClassName: "bg-[#FBDED9]", // Light red
      };
    case ChatSummaryStatus.NO_AUDIO:
      return {
        label: "No audio detected",
        icon: ErrorIcon,
      };
    default:
      return {
        label: "Unknown",
        dotClassName: "bg-[#6B7280]", // Gray
        outerDivClassName: "bg-[#F3F4F6]", // Light gray
      };
  }
};

export const getSourceChipConfig = (provider: CallProvider): ChipConfig => {
  switch (provider) {
    case CallProvider.AUDIO_UPLOAD:
      return {
        label: "Uploaded",
        dotClassName: "hidden",
        outerDivClassName: "bg-[#E2F2FF] text-[#0957D0]", // Blue
      };
    default:
      return {
        label: "Live Session",
        dotClassName: "hidden",
        outerDivClassName: "bg-[#EDE7F6] text-[#673AB7]", // Purple
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
  if (!timezoneId || !date) return null;

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
