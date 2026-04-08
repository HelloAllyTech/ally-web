import { format } from "date-fns";

interface DurationLabels {
  lessThanOneMinute: string;
  hour: string;
  hours: string;
  minute: string;
  minutes: string;
  second: string;
  seconds: string;
}

interface DurationFormatOptions {
  labels?: Partial<DurationLabels>;
}

const DEFAULT_DURATION_LABELS: DurationLabels = {
  lessThanOneMinute: "Less than 1 min",
  hour: "hr",
  hours: "hrs",
  minute: "min",
  minutes: "mins",
  second: "sec",
  seconds: "secs",
};

/**
 * Converts a date to a formatted time string (e.g., "2:30 PM")
 * @param date - Optional date string or Date object. If not provided, uses current date
 * @returns Formatted time string in 12-hour format with AM/PM
 */
export const timeStamp = (date?: string) =>
  new Date(date ? date : new Date()).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

/**
 * Converts a date to a formatted date string (e.g., "Monday, January 15")
 * @param date - Optional date string or Date object. If not provided, uses current date
 * @returns Formatted date string with weekday, month, and day
 */
export const dateStamp = (date?: string) =>
  new Date(date ? date : new Date()).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

/**
 * Formats a date string to ISO date format (YYYY-MM-DD) for message display
 * @param dateStr - Date string to format
 * @returns ISO date string (YYYY-MM-DD) or null if invalid date
 */
export const formatMessageDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
};

/**
 * Formats a date to a human-readable string with both date and time
 * @param date - Date object or date string to format
 * @returns Formatted string like "January 15, 2024 2:30 PM"
 */
export const getFormattedDate = (date: Date | string, locale = "en-US"): string => {
  const d = new Date(date);

  const formattedDate = d.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = d.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${formattedDate} ${formattedTime}`; // Concatenating manually to avoid 'at' in between
};

/**
 * Type definition for date range options
 */
export type DateRangeType = "day" | "week" | "month" | "year";

/**
 * Gets the start and end dates for a specified date range type
 * @param date - Reference date for calculating the range
 * @param type - Type of date range: "day", "week", "month", or "year"
 * @returns Array containing [startDate, endDate] for the specified range
 */
export const getDateRange = (date: Date, type: DateRangeType): Date[] => {
  const startDate = new Date(date);
  const endDate = new Date(date);

  if (type === "day") {
    // For day range: start at 00:00:00, end at 23:59:59
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (type === "week") {
    // For week range: start 6 days before, end at provided date
    endDate.setHours(23, 59, 59, 999);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
  } else if (type === "month") {
    // For month range: start on 1st day, end on last day of month
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
  } else if (type === "year") {
    // For year range: start on January 1st, end on December 31st
    startDate.setMonth(0, 1); // Set to January 1st
    startDate.setHours(0, 0, 0, 0);
    endDate.setMonth(11, 31); // Set to December 31st
    endDate.setHours(23, 59, 59, 999);
  }

  return [startDate, endDate];
};

/**
 * Converts seconds to a human-readable duration string
 * @param totalSeconds - Number of seconds to convert
 * @returns Formatted duration string (e.g., "2 hrs 30 mins 45 secs") or "--" if no seconds provided
 */
export const convertSecondsToDuration = (
  totalSeconds?: number,
  options?: DurationFormatOptions,
): string => {
  if (!totalSeconds) return "--";
  const labels = { ...DEFAULT_DURATION_LABELS, ...options?.labels };
  if (totalSeconds < 60) return labels.lessThanOneMinute;

  const hours = Math.floor(totalSeconds / (60 * 60)); // Calculate total hours
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60); // Calculate remaining minutes
  const seconds = totalSeconds % 60; // Calculate remaining seconds

  const parts: string[] = [];

  if (hours) {
    parts.push(`${hours} ${hours > 1 ? labels.hours : labels.hour}`);
  }

  if (minutes) {
    parts.push(`${minutes} ${minutes > 1 ? labels.minutes : labels.minute}`);
  }

  if (seconds) {
    parts.push(`${seconds} ${seconds > 1 ? labels.seconds : labels.second}`);
  }

  return parts.join(" ");
};

/**
 * Converts seconds to a human-readable duration string
 * @param totalSeconds - Number of seconds to convert
 * @returns Formatted duration string (e.g., "2 hrs 30 mins 45 secs") or "--" if no seconds provided
 */
export const convertSecondsToHMS = (totalSeconds?: number): string => {
  if (!totalSeconds) return "--";

  const hours = Math.floor(totalSeconds / (60 * 60)); // Calculate total hours
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60); // Calculate remaining minutes
  const seconds = totalSeconds % 60; // Calculate remaining seconds

  return `${hours ? `${hours} hr` : ""}${hours > 1 ? "s" : ""} ${
    minutes ? `${minutes} min` : ""
  }${minutes > 1 ? "s" : ""} ${seconds ? `${seconds} sec` : ""}${seconds > 1 ? "s" : ""}`;
};

/**
 * Formats a date-time string according to a specified format string
 *
 * @param dateTime - The date-time string to format (ISO string, date string, etc.)
 * @param formatString - The format string to apply (e.g., 'MMM dd, yyyy', 'HH:mm:ss')
 * @returns Formatted date string or '--' if dateTime is invalid/empty
 *
 * @example
 * ```typescript
 * getFormattedDateTime('2024-01-15T10:30:00Z', 'MMM dd, yyyy')
 * // Returns: 'Jan 15, 2024'
 *
 * getFormattedDateTime('2024-01-15T10:30:00Z', 'HH:mm:ss')
 * // Returns: '10:30:00'
 *
 * getFormattedDateTime('', 'MMM dd, yyyy')
 * // Returns: '--'
 * ```
 */
export const getFormattedDateTime = (dateTime: string, formatString: string) => {
  if (!dateTime) return "--";
  const date = new Date(dateTime);
  return format(date, formatString);
};

export const getElapsedTimeInMinutes = (startTime: string) => {
  const now = new Date();
  const startTimeDate = new Date(startTime);
  const elapsedTime = now.getTime() - startTimeDate.getTime();
  return Math.max(0, Math.floor(elapsedTime / 60000));
};

export const getFormattedTimeFromDuration = (
  duration: number,
  format: "HH:mm:ss" | "HH:mm" | "mm:ss" | "ss" = "HH:mm:ss",
): string => {
  const pad = (n: number) => String(n).padStart(2, "0");

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;

  switch (format) {
    case "HH:mm:ss":
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    case "HH:mm":
      return `${pad(hours)}:${pad(minutes)}`;

    case "mm:ss":
      return `${pad(minutes)}:${pad(seconds)}`;

    case "ss":
      return `${pad(seconds)}`;

    default:
      return "--";
  }
};
