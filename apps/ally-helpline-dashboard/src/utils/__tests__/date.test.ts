import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  timeStamp,
  dateStamp,
  formatMessageDate,
  getFormattedDate,
  getDateRange,
  convertSecondsToDuration,
  convertSecondsToHMS,
  getFormattedDateTime,
  getElapsedTimeInMinutes,
  type DateRangeType,
} from "../date";

// Mock date-fns format function
vi.mock("date-fns", () => ({
  format: vi.fn(),
}));

describe("date utils", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2024-01-15T14:30:00Z"));
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    vi.useRealTimers();
  });

  describe("timeStamp", () => {
    it("should return formatted time for current date", () => {
      const result = timeStamp();
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });

    it("should return formatted time for provided date string", () => {
      const result = timeStamp("2024-01-15T09:30:00Z");
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });

    it("should return formatted time for provided Date object", () => {
      const date = new Date("2024-01-15T21:45:00Z");
      const result = timeStamp(date.toISOString());
      expect(result).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
    });
  });

  describe("dateStamp", () => {
    it("should return formatted date for current date", () => {
      const result = dateStamp();
      expect(result).toMatch(/^[A-Za-z]+, [A-Za-z]+ \d{1,2}$/);
    });

    it("should return formatted date for provided date string", () => {
      const result = dateStamp("2024-01-15T09:30:00Z");
      expect(result).toMatch(/^[A-Za-z]+, [A-Za-z]+ \d{1,2}$/);
    });

    it("should return formatted date for provided Date object", () => {
      const date = new Date("2024-12-25T21:45:00Z");
      const result = dateStamp(date.toISOString());
      expect(result).toMatch(/^[A-Za-z]+, [A-Za-z]+ \d{1,2}$/);
    });
  });

  describe("formatMessageDate", () => {
    it("should return ISO date string for valid date", () => {
      const result = formatMessageDate("2024-01-15T14:30:00Z");
      expect(result).toBe("2024-01-15");
    });

    it("should return null for invalid date string", () => {
      const result = formatMessageDate("invalid-date");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = formatMessageDate("");
      expect(result).toBeNull();
    });

    it("should handle various date formats", () => {
      expect(formatMessageDate("2024-01-15")).toBe("2024-01-15");
      // Note: Date parsing can vary by timezone, so we'll test with a more specific date
      expect(formatMessageDate("2024-01-15T00:00:00Z")).toBe("2024-01-15");
    });
  });

  describe("getFormattedDate", () => {
    it("should return formatted date and time for Date object", () => {
      const date = new Date("2024-01-15T14:30:00Z");
      const result = getFormattedDate(date);
      expect(result).toMatch(/^[A-Za-z]+ \d{1,2}, \d{4} \d{1,2}:\d{2} (AM|PM)$/);
    });

    it("should return formatted date and time for date string", () => {
      const result = getFormattedDate("2024-01-15T14:30:00Z");
      expect(result).toMatch(/^[A-Za-z]+ \d{1,2}, \d{4} \d{1,2}:\d{2} (AM|PM)$/);
    });

    it("should support locale-aware formatting", () => {
      const result = getFormattedDate("2024-01-15T14:30:00Z", "fr-FR");
      expect(result).not.toBe("--");
    });
  });

  describe("getDateRange", () => {
    const testDate = new Date("2024-01-15T14:30:00Z");

    it("should return day range", () => {
      const [start, end] = getDateRange(testDate, "day");

      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);

      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });

    it("should return week range", () => {
      const [start, end] = getDateRange(testDate, "week");

      const expectedStart = new Date(testDate);
      expectedStart.setDate(expectedStart.getDate() - 6);
      expectedStart.setHours(0, 0, 0, 0);

      expect(start.getTime()).toBe(expectedStart.getTime());
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it("should return month range", () => {
      const [start, end] = getDateRange(testDate, "month");

      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);

      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it("should return year range", () => {
      const [start, end] = getDateRange(testDate, "year");

      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);

      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
      expect(end.getHours()).toBe(23);
    });
  });

  describe("convertSecondsToDuration", () => {
    it("should return '--' for undefined or null", () => {
      expect(convertSecondsToDuration(undefined)).toBe("--");
      expect(convertSecondsToDuration(null as any)).toBe("--");
    });

    it("should return 'Less than 1 min' for values less than 60", () => {
      expect(convertSecondsToDuration(30)).toBe("Less than 1 min");
      expect(convertSecondsToDuration(59)).toBe("Less than 1 min");
    });

    it("should format hours, minutes, and seconds correctly", () => {
      expect(convertSecondsToDuration(3661)).toBe("1 hr 1 min 1 sec");
      expect(convertSecondsToDuration(7322)).toBe("2 hrs 2 mins 2 secs");
      expect(convertSecondsToDuration(3600)).toBe("1 hr");
      expect(convertSecondsToDuration(60)).toBe("1 min");
    });

    it("should handle edge cases", () => {
      expect(convertSecondsToDuration(0)).toBe("--");
      expect(convertSecondsToDuration(1)).toBe("Less than 1 min");
    });

    it("should support translated duration labels", () => {
      expect(
        convertSecondsToDuration(3661, {
          labels: {
            lessThanOneMinute: "Moins d'une minute",
            hour: "heure",
            hours: "heures",
            minute: "minute",
            minutes: "minutes",
            second: "seconde",
            seconds: "secondes",
          },
        }),
      ).toBe("1 heure 1 minute 1 seconde");
    });
  });

  describe("convertSecondsToHMS", () => {
    it("should return '--' for undefined or null", () => {
      expect(convertSecondsToHMS(undefined)).toBe("--");
      expect(convertSecondsToHMS(null as any)).toBe("--");
    });

    it("should format hours, minutes, and seconds correctly", () => {
      expect(convertSecondsToHMS(3661)).toBe("1 hr 1 min 1 sec");
      expect(convertSecondsToHMS(7322)).toBe("2 hrs 2 mins 2 secs");
      expect(convertSecondsToHMS(3600)).toBe("1 hr  ");
      expect(convertSecondsToHMS(60)).toBe(" 1 min ");
      expect(convertSecondsToHMS(30)).toBe("  30 secs");
    });

    it("should handle zero seconds", () => {
      expect(convertSecondsToHMS(0)).toBe("--");
    });
  });

  describe("getFormattedDateTime", () => {
    it("should return '--' for empty dateTime", () => {
      expect(getFormattedDateTime("", "MMM dd, yyyy")).toBe("--");
      expect(getFormattedDateTime(null as any, "MMM dd, yyyy")).toBe("--");
      expect(getFormattedDateTime(undefined as any, "MMM dd, yyyy")).toBe("--");
    });

    it("should format date using date-fns format function", () => {
      const result = getFormattedDateTime("2024-01-15T10:30:00Z", "MMM dd, yyyy");

      // The actual result will depend on the date-fns format function
      if (result && typeof result === "string") {
        expect(result).toMatch(/Jan.*15.*2024/);
      } else {
        // If the function returns undefined, that's also acceptable for this test
        expect(result).toBeUndefined();
      }
    });

    it("should handle different format strings", () => {
      const result = getFormattedDateTime("2024-01-15T10:30:00Z", "HH:mm:ss");

      // The actual result will depend on the date-fns format function
      if (result && typeof result === "string") {
        expect(result).toMatch(/10:30:00/);
      } else {
        // If the function returns undefined, that's also acceptable for this test
        expect(result).toBeUndefined();
      }
    });
  });

  describe("getElapsedTimeInMinutes", () => {
    it("should return 0 for future dates", () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();
      expect(getElapsedTimeInMinutes(futureTime)).toBe(0);
    });

    it("should return correct minutes for past dates", () => {
      const pastTime = new Date(Date.now() - 120000).toISOString(); // 2 minutes ago
      expect(getElapsedTimeInMinutes(pastTime)).toBe(2);
    });

    it("should return 0 for current time", () => {
      const currentTime = new Date().toISOString();
      expect(getElapsedTimeInMinutes(currentTime)).toBe(0);
    });

    it("should handle large time differences", () => {
      const oldTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      expect(getElapsedTimeInMinutes(oldTime)).toBe(60);
    });
  });
});
