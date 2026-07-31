import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ButtonVariant } from "@components/types";
import { SimulationStatus, UserRoles } from "@types";

import {
  validateEmail,
  parseEmailList,
  getKeyFromIndex,
  updateQueryParamListWithoutReload,
  openLinkInNewTab,
  isPathExcluded,
  decodeUint8ToJson,
  formatDate,
  formatCapitalizedEnum,
  getButtonStyles,
  formatSimulationUsage,
  getChipValue,
  getSimulationVoiceOptions,
  isObject,
  isNumber,
  isNonEmptyString,
  isArray,
  validateTimeRange,
  toLocationSlug,
  fromLocationSlug,
} from "../common";

describe("common utils", () => {
  describe("validateEmail", () => {
    it("should return true for valid email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
      expect(validateEmail("user+tag@example.com")).toBe(true);
      expect(validateEmail("user_name@example.com")).toBe(true);
    });

    it("should return false for invalid email addresses", () => {
      expect(validateEmail("")).toBe(false);
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user@domain")).toBe(false);
      expect(validateEmail("user @domain.com")).toBe(false);
      expect(validateEmail("user@domain .com")).toBe(false);
    });
  });

  describe("getKeyFromIndex", () => {
    it("should generate key with default prefix", () => {
      expect(getKeyFromIndex(0)).toBe("key-0");
      expect(getKeyFromIndex(5)).toBe("key-5");
      expect(getKeyFromIndex(100)).toBe("key-100");
    });

    it("should generate key with custom prefix", () => {
      expect(getKeyFromIndex(0, "item")).toBe("item-0");
      expect(getKeyFromIndex(5, "row")).toBe("row-5");
      expect(getKeyFromIndex(100, "custom")).toBe("custom-100");
    });

    it("should handle negative indices", () => {
      expect(getKeyFromIndex(-1)).toBe("key--1");
      expect(getKeyFromIndex(-5, "item")).toBe("item--5");
    });
  });

  describe("updateQueryParamListWithoutReload", () => {
    beforeEach(() => {
      // Mock window.location and window.history
      delete (window as any).location;
      window.location = {
        pathname: "/test",
        search: "",
      } as any;

      window.history.pushState = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should update single query parameter", () => {
      updateQueryParamListWithoutReload([{ key: "page", value: "1" }]);

      expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/test?page=1");
    });

    it("should update multiple query parameters", () => {
      updateQueryParamListWithoutReload([
        { key: "page", value: "1" },
        { key: "sort", value: "name" },
        { key: "filter", value: "active" },
      ]);

      expect(window.history.pushState).toHaveBeenCalledWith(
        {},
        "",
        "/test?page=1&sort=name&filter=active",
      );
    });

    it("should override existing query parameters", () => {
      window.location.search = "?page=1&sort=name";

      updateQueryParamListWithoutReload([{ key: "page", value: "2" }]);

      expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/test?page=2&sort=name");
    });

    it("should handle empty array", () => {
      updateQueryParamListWithoutReload([]);

      expect(window.history.pushState).toHaveBeenCalledWith({}, "", "/test?");
    });
  });

  describe("openLinkInNewTab", () => {
    beforeEach(() => {
      window.open = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should open link in new tab with default target", () => {
      openLinkInNewTab("https://example.com");

      expect(window.open).toHaveBeenCalledWith(
        "https://example.com",
        "_blank",
        "noopener,noreferrer",
      );
    });

    it("should open link with custom target", () => {
      openLinkInNewTab("https://example.com", "_self");

      expect(window.open).toHaveBeenCalledWith(
        "https://example.com",
        "_self",
        "noopener,noreferrer",
      );
    });
  });

  describe("isPathExcluded", () => {
    it("should return true when path matches excluded paths", () => {
      expect(isPathExcluded("/admin/users", ["/admin/users"])).toBe(true);
      expect(isPathExcluded("/admin/settings", ["/admin/users", "/admin/settings"])).toBe(true);
    });

    it("should return false when path does not match excluded paths", () => {
      expect(isPathExcluded("/dashboard", ["/admin/users"])).toBe(false);
      expect(isPathExcluded("/users", ["/admin/users"])).toBe(false);
    });

    it("should handle empty excluded paths array", () => {
      expect(isPathExcluded("/any/path", [])).toBe(false);
    });

    it("should handle wildcard patterns", () => {
      expect(isPathExcluded("/admin/users/123", ["/admin/users/:id"])).toBe(true);
      expect(isPathExcluded("/admin/settings/general", ["/admin/settings/:section"])).toBe(true);
    });
  });

  describe("decodeUint8ToJson", () => {
    it("should decode valid Uint8Array to JSON", () => {
      const jsonString = JSON.stringify({ name: "test", value: 123 });
      const uint8Array = new TextEncoder().encode(jsonString);

      const result = decodeUint8ToJson(uint8Array);

      expect(result).toEqual({ name: "test", value: 123 });
    });

    it("should return null for invalid JSON in Uint8Array", () => {
      const invalidJson = new TextEncoder().encode("not valid json");

      const result = decodeUint8ToJson(invalidJson);

      expect(result).toBeNull();
    });

    it("should return null for non-Uint8Array input", () => {
      expect(decodeUint8ToJson("string")).toBeNull();
      expect(decodeUint8ToJson(123)).toBeNull();
      expect(decodeUint8ToJson(null)).toBeNull();
      expect(decodeUint8ToJson(undefined)).toBeNull();
    });

    it("should handle empty Uint8Array", () => {
      const emptyArray = new Uint8Array(0);

      const result = decodeUint8ToJson(emptyArray);

      expect(result).toBeNull();
    });

    it("should handle large Uint8Array (chunking)", () => {
      // Create a large JSON object
      const largeObject = { data: "x".repeat(10000) };
      const jsonString = JSON.stringify(largeObject);
      const uint8Array = new TextEncoder().encode(jsonString);

      const result = decodeUint8ToJson(uint8Array);

      expect(result).toEqual(largeObject);
    });
  });

  describe("formatDate", () => {
    it("should format date string correctly", () => {
      expect(formatDate("2024-01-15")).toBe("15 Jan 2024");
      expect(formatDate("2024-12-25")).toBe("25 Dec 2024");
      expect(formatDate("2024-06-01")).toBe("1 Jun 2024");
    });

    it("should handle ISO date strings", () => {
      expect(formatDate("2024-01-15T10:30:00Z")).toBe("15 Jan 2024");
      // Note: Date formatting may vary by timezone, so we just check it's a valid date format
      const result = formatDate("2024-12-25T00:00:00Z");
      expect(result).toMatch(/\d{1,2} \w{3} 2024/);
    });

    it("should handle different date formats", () => {
      expect(formatDate("2024/01/15")).toBe("15 Jan 2024");
      expect(formatDate("Jan 15, 2024")).toBe("15 Jan 2024");
    });
  });

  describe("formatCapitalizedEnum", () => {
    it("should capitalize and format string enums", () => {
      expect(formatCapitalizedEnum("active")).toBe("Active");
      expect(formatCapitalizedEnum("INACTIVE")).toBe("Inactive");
      expect(formatCapitalizedEnum("pending_review")).toBe("Pending review");
      expect(formatCapitalizedEnum("in-progress")).toBe("In progress");
    });

    it("should handle UserRoles object", () => {
      const role = { name: "admin_user" } as UserRoles;
      expect(formatCapitalizedEnum(role)).toBe("Admin user");
    });

    it("should handle empty strings", () => {
      expect(formatCapitalizedEnum("")).toBe("");
    });

    it("should handle single character strings", () => {
      expect(formatCapitalizedEnum("a")).toBe("A");
    });

    it("should replace underscores and hyphens with spaces", () => {
      expect(formatCapitalizedEnum("super_admin_role")).toBe("Super admin role");
      expect(formatCapitalizedEnum("user-manager-role")).toBe("User manager role");
    });
  });

  describe("getButtonStyles", () => {
    it("should return icon button styles", () => {
      const styles = getButtonStyles(ButtonVariant.ICON);
      expect(styles).toContain("bg-transparent");
      expect(styles).toContain("border-none");
    });

    it("should return text button styles", () => {
      const styles = getButtonStyles(ButtonVariant.TEXT);
      expect(styles).toContain("bg-transparent");
      expect(styles).toContain("border-none");
    });
  });

  describe("formatSimulationUsage", () => {
    it("should format singular usage", () => {
      expect(formatSimulationUsage(1)).toBe("1 time");
    });

    it("should format plural usage", () => {
      expect(formatSimulationUsage(0)).toBe("0 times");
      expect(formatSimulationUsage(2)).toBe("2 times");
      expect(formatSimulationUsage(10)).toBe("10 times");
      expect(formatSimulationUsage(100)).toBe("100 times");
    });
  });

  describe("getChipValue", () => {
    it("should return empty string for empty array", () => {
      expect(getChipValue([])).toBe("");
    });

    it("should return single item", () => {
      expect(getChipValue(["Item 1"])).toBe("Item 1");
    });

    it("should return first item with count for multiple items", () => {
      expect(getChipValue(["Item 1", "Item 2"])).toBe("Item 1 +1");
      expect(getChipValue(["Item 1", "Item 2", "Item 3"])).toBe("Item 1 +2");
      expect(getChipValue(["Item 1", "Item 2", "Item 3", "Item 4"])).toBe("Item 1 +3");
    });

    it("should handle null or undefined input", () => {
      expect(getChipValue(null as any)).toBe("");
      expect(getChipValue(undefined as any)).toBe("");
    });
  });

  describe("getSimulationVoiceOptions", () => {
    it("should map voices with id and name", () => {
      const voices = [
        { id: "voice1", name: "male_voice" },
        { id: "voice2", name: "female_voice" },
      ];

      const result = getSimulationVoiceOptions(voices);

      expect(result).toEqual([
        { value: "voice2", label: "Female voice", groupLabel: "Unspecified gender" },
        { value: "voice1", label: "Male voice", groupLabel: "Unspecified gender" },
      ]);
    });

    it("should handle voices with only id", () => {
      const voices = [{ id: "voice1" }, { id: "voice2" }];

      const result = getSimulationVoiceOptions(voices);

      expect(result).toEqual([
        { value: "voice1", label: "Voice1", groupLabel: "Unspecified gender" },
        { value: "voice2", label: "Voice2", groupLabel: "Unspecified gender" },
      ]);
    });

    it("should handle voices with only name", () => {
      const voices = [{ name: "male_voice" }, { name: "female_voice" }];

      const result = getSimulationVoiceOptions(voices);

      expect(result).toEqual([
        { value: "female_voice", label: "Female voice", groupLabel: "Unspecified gender" },
        { value: "male_voice", label: "Male voice", groupLabel: "Unspecified gender" },
      ]);
    });

    it("should filter out invalid voices", () => {
      const voices = [
        { id: "voice1", name: "male_voice" },
        { id: "", name: "" },
        {},
        { id: "voice2", name: "female_voice" },
      ];

      const result = getSimulationVoiceOptions(voices);

      expect(result).toEqual([
        { value: "voice2", label: "Female voice", groupLabel: "Unspecified gender" },
        { value: "voice1", label: "Male voice", groupLabel: "Unspecified gender" },
      ]);
    });

    it("groups by provider then gender", () => {
      const voices = [
        { id: "s-male", name: "abhilash", provider: "SARVAM", gender: "male" },
        { id: "g-female", name: "achernar", provider: "GOOGLE", gender: "female" },
        { id: "s-female", name: "anushka", provider: "SARVAM", gender: "female" },
      ];

      expect(getSimulationVoiceOptions(voices)).toEqual([
        { value: "g-female", label: "Achernar", groupLabel: "Google · Female" },
        { value: "s-female", label: "Anushka", groupLabel: "Sarvam · Female" },
        { value: "s-male", label: "Abhilash", groupLabel: "Sarvam · Male" },
      ]);
    });

    it("reads gender from config when the API does not send it flattened", () => {
      const voices = [
        { id: "v1", name: "abhilash", provider: "SARVAM", config: { gender: "male" } },
      ];

      expect(getSimulationVoiceOptions(voices)[0].groupLabel).toBe("Sarvam · Male");
    });

    it("should handle empty array", () => {
      expect(getSimulationVoiceOptions([])).toEqual([]);
    });

    it("should handle undefined input", () => {
      expect(getSimulationVoiceOptions()).toEqual([]);
    });
  });

  describe("isObject", () => {
    it("should return true for plain objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: "value" })).toBe(true);
      expect(isObject({ nested: { key: "value" } })).toBe(true);
    });

    it("should return false for arrays", () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it("should return false for null", () => {
      expect(isObject(null)).toBe(false);
    });

    it("should return false for primitives", () => {
      expect(isObject(undefined)).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject("string")).toBe(false);
      expect(isObject(true)).toBe(false);
    });

    it("should return true for object instances", () => {
      expect(isObject(new Date())).toBe(true);
      expect(isObject(new Error())).toBe(true);
    });
  });

  describe("isNumber", () => {
    it("should return true for valid numbers", () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(123)).toBe(true);
      expect(isNumber(-456)).toBe(true);
      expect(isNumber(3.14)).toBe(true);
      expect(isNumber(-3.14)).toBe(true);
    });

    it("should return false for NaN", () => {
      expect(isNumber(NaN)).toBe(false);
    });

    it("should return false for Infinity", () => {
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber(-Infinity)).toBe(false);
    });

    it("should return false for non-numbers", () => {
      expect(isNumber("123")).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
      expect(isNumber([])).toBe(false);
    });
  });

  describe("isNonEmptyString", () => {
    it("should return true for non-empty strings", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("123")).toBe(true);
      expect(isNonEmptyString("true")).toBe(true);
    });

    it("should return false for empty or non-strings", () => {
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString(123 as any)).toBe(false);
      expect(isNonEmptyString(true as any)).toBe(false);
      expect(isNonEmptyString(null as any)).toBe(false);
      expect(isNonEmptyString(undefined as any)).toBe(false);
      expect(isNonEmptyString({} as any)).toBe(false);
      expect(isNonEmptyString([] as any)).toBe(false);
    });
  });

  describe("isArray", () => {
    it("should return true for arrays", () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray(["a", "b", "c"])).toBe(true);
      expect(isArray([{ key: "value" }])).toBe(true);
    });

    it("should return false for non-arrays", () => {
      expect(isArray("string")).toBe(false);
      expect(isArray(123)).toBe(false);
      expect(isArray({})).toBe(false);
      expect(isArray(null)).toBe(false);
      expect(isArray(undefined)).toBe(false);
    });

    it("should return false for array-like objects", () => {
      expect(isArray({ length: 0 })).toBe(false);
      expect(isArray({ 0: "a", 1: "b", length: 2 })).toBe(false);
    });
  });

  describe("validateTimeRange", () => {
    it("should return valid for time within range", () => {
      const result = validateTimeRange("00:10:00", "00:05:00", "02:00:00");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for time below minimum", () => {
      const result = validateTimeRange("00:03:00", "00:05:00", "02:00:00");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Minimum time is 00:05:00");
    });

    it("should return invalid for time above maximum", () => {
      const result = validateTimeRange("02:00:01", "00:05:00", "02:00:00");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Maximum time is 02:00:00");
    });

    it("should accept minimum boundary value", () => {
      const result = validateTimeRange("00:05:00", "00:05:00", "02:00:00");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept maximum boundary value", () => {
      const result = validateTimeRange("02:00:00", "00:05:00", "02:00:00");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid when no constraints provided", () => {
      const result = validateTimeRange("23:59:59");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return valid for empty string", () => {
      const result = validateTimeRange("", "00:05:00", "02:00:00");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should handle only minTime constraint", () => {
      const resultValid = validateTimeRange("00:10:00", "00:05:00", undefined);
      expect(resultValid.isValid).toBe(true);

      const resultInvalid = validateTimeRange("00:03:00", "00:05:00", undefined);
      expect(resultInvalid.isValid).toBe(false);
      expect(resultInvalid.error).toBe("Minimum time is 00:05:00");
    });

    it("should handle only maxTime constraint", () => {
      const resultValid = validateTimeRange("01:00:00", undefined, "02:00:00");
      expect(resultValid.isValid).toBe(true);

      const resultInvalid = validateTimeRange("02:00:01", undefined, "02:00:00");
      expect(resultInvalid.isValid).toBe(false);
      expect(resultInvalid.error).toBe("Maximum time is 02:00:00");
    });

    it("should correctly compare times with different hours", () => {
      const result1 = validateTimeRange("01:00:00", "00:30:00", "02:00:00");
      expect(result1.isValid).toBe(true);

      const result2 = validateTimeRange("02:30:00", "00:30:00", "02:00:00");
      expect(result2.isValid).toBe(false);
    });

    it("should correctly compare times with same hours but different minutes", () => {
      const result1 = validateTimeRange("01:15:00", "01:10:00", "01:20:00");
      expect(result1.isValid).toBe(true);

      const result2 = validateTimeRange("01:05:00", "01:10:00", "01:20:00");
      expect(result2.isValid).toBe(false);
    });

    it("should correctly compare times with same hours and minutes but different seconds", () => {
      const result1 = validateTimeRange("01:15:30", "01:15:20", "01:15:40");
      expect(result1.isValid).toBe(true);

      const result2 = validateTimeRange("01:15:10", "01:15:20", "01:15:40");
      expect(result2.isValid).toBe(false);
    });
  });

  describe("toLocationSlug", () => {
    it("should convert display text to lowercase underscore slug", () => {
      expect(toLocationSlug("Login Button")).toBe("login_button");
      expect(toLocationSlug("Profile Icon")).toBe("profile_icon");
      expect(toLocationSlug("Logout Button")).toBe("logout_button");
    });

    it("should trim leading and trailing whitespace", () => {
      expect(toLocationSlug("  Login Button  ")).toBe("login_button");
    });

    it("should collapse multiple spaces into a single underscore", () => {
      expect(toLocationSlug("Profile   Page")).toBe("profile_page");
    });

    it("should handle single word", () => {
      expect(toLocationSlug("Dashboard")).toBe("dashboard");
    });

    it("should handle already lowercase text", () => {
      expect(toLocationSlug("login button")).toBe("login_button");
    });

    it("should handle empty string", () => {
      expect(toLocationSlug("")).toBe("");
    });
  });

  describe("fromLocationSlug", () => {
    it("should convert slug to title-case display text", () => {
      expect(fromLocationSlug("login_button")).toBe("Login Button");
      expect(fromLocationSlug("profile_icon")).toBe("Profile Icon");
      expect(fromLocationSlug("logout_button")).toBe("Logout Button");
    });

    it("should handle single word slug", () => {
      expect(fromLocationSlug("dashboard")).toBe("Dashboard");
    });

    it("should handle three-word slug", () => {
      expect(fromLocationSlug("create_new_account")).toBe("Create New Account");
    });

    it("should handle empty string", () => {
      expect(fromLocationSlug("")).toBe("");
    });

    it("round-trip: toLocationSlug then fromLocationSlug restores title-case", () => {
      expect(fromLocationSlug(toLocationSlug("Login Button"))).toBe("Login Button");
      expect(fromLocationSlug(toLocationSlug("Profile Icon"))).toBe("Profile Icon");
    });
  });

  describe("parseEmailList", () => {
    it("splits on newlines, commas, and semicolons", () => {
      expect(parseEmailList("a@x.com\nb@x.com, c@x.com; d@x.com")).toEqual([
        "a@x.com",
        "b@x.com",
        "c@x.com",
        "d@x.com",
      ]);
    });

    it("trims surrounding whitespace from each entry", () => {
      expect(parseEmailList("  a@x.com  ,\t b@x.com \n")).toEqual(["a@x.com", "b@x.com"]);
    });

    it("drops empty entries from trailing/repeated separators", () => {
      expect(parseEmailList("a@x.com,,\n\n;b@x.com,")).toEqual(["a@x.com", "b@x.com"]);
    });

    it("de-duplicates case-insensitively, preserving first-seen casing", () => {
      expect(parseEmailList("John@X.com\njohn@x.com\nJOHN@X.COM")).toEqual(["John@X.com"]);
    });

    it("returns an empty array for empty or whitespace-only input", () => {
      expect(parseEmailList("")).toEqual([]);
      expect(parseEmailList("   \n , ; ")).toEqual([]);
    });

    it("handles a single email with no separators", () => {
      expect(parseEmailList("solo@x.com")).toEqual(["solo@x.com"]);
    });
  });
});
