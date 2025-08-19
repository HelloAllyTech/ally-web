/**
 * Converts a date to a formatted time string (e.g., "2:30 PM")
 * @param date - Optional date string or Date object. If not provided, uses current date
 * @returns Formatted time string in 12-hour format with AM/PM
 */
export const timeStamp = (date?: string) =>
  new Date(date ? date : new Date()).toLocaleTimeString([], {
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
export const getFormattedDate = (date: Date | string): string => {
  const d = new Date(date);

  const formattedDate = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = d.toLocaleTimeString("en-US", {
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
export const convertSecondsToDuration = (totalSeconds?: number): string => {
  if (!totalSeconds) return "--";
  if (totalSeconds < 60) return "Less than 1 min";

  const hours = Math.floor(totalSeconds / (60 * 60)); // Calculate total hours
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60); // Calculate remaining minutes
  const seconds = totalSeconds % 60; // Calculate remaining seconds

  return `${hours ? `${hours} hr` : ""}${hours > 1 ? "s" : ""} ${
    minutes ? `${minutes} min` : ""
  }${minutes > 1 ? "s" : ""} ${seconds ? `${seconds} sec` : ""}${seconds > 1 ? "s" : ""}`;
};
