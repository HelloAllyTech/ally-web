import { matchPath } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  validateEmail,
  getKeyFromIndex,
  updateQueryParamListWithoutReload,
  openLinkInNewTab,
  isPathExcluded,
  decodeUint8ToJson,
} from "../common";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  matchPath: vi.fn(),
}));

// Mock window methods
const mockPushState = vi.fn();
const mockOpen = vi.fn();

Object.defineProperty(window, "location", {
  value: {
    pathname: "/test",
    search: "?param1=value1",
  },
  writable: true,
});

Object.defineProperty(window, "history", {
  value: {
    pushState: mockPushState,
  },
  writable: true,
});

Object.defineProperty(window, "open", {
  value: mockOpen,
  writable: true,
});

describe("common utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateEmail", () => {
    it("should return true for valid email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
      expect(validateEmail("test+tag@example.org")).toBe(true);
    });

    it("should return false for invalid email addresses", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("test@.com")).toBe(false);
    });

    it("should return false for empty or null values", () => {
      expect(validateEmail("")).toBe("");
      expect(validateEmail(null as any)).toBe(null);
      expect(validateEmail(undefined as any)).toBe(undefined);
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
      expect(getKeyFromIndex(5, "user")).toBe("user-5");
      expect(getKeyFromIndex(100, "component")).toBe("component-100");
    });
  });

  describe("updateQueryParamListWithoutReload", () => {
    it("should update URL with new query parameters", () => {
      const searchParamList = [
        { key: "param1", value: "newValue1" },
        { key: "param2", value: "value2" },
      ];

      updateQueryParamListWithoutReload(searchParamList);

      expect(mockPushState).toHaveBeenCalledWith({}, "", "/test?param1=newValue1&param2=value2");
    });

    it("should handle empty search param list", () => {
      updateQueryParamListWithoutReload([]);

      expect(mockPushState).toHaveBeenCalledWith({}, "", "/test?param1=value1");
    });

    it("should overwrite existing parameters", () => {
      const searchParamList = [{ key: "param1", value: "overwritten" }];

      updateQueryParamListWithoutReload(searchParamList);

      expect(mockPushState).toHaveBeenCalledWith({}, "", "/test?param1=overwritten");
    });
  });

  describe("openLinkInNewTab", () => {
    it("should open URL in new tab with default target", () => {
      const url = "https://example.com";
      openLinkInNewTab(url);

      expect(mockOpen).toHaveBeenCalledWith(url, "_blank", "noopener,noreferrer");
    });

    it("should open URL with custom target", () => {
      const url = "https://example.com";
      const target = "_self";
      openLinkInNewTab(url, target);

      expect(mockOpen).toHaveBeenCalledWith(url, target, "noopener,noreferrer");
    });
  });

  describe("isPathExcluded", () => {
    it("should return true when path matches excluded paths", () => {
      const mockMatchPath = vi.mocked(matchPath);
      mockMatchPath.mockReturnValue({ pathname: "/excluded" } as any);

      const result = isPathExcluded("/excluded", ["/excluded", "/other"]);

      expect(result).toBe(true);
      expect(mockMatchPath).toHaveBeenCalledWith("/excluded", "/excluded");
    });

    it("should return false when path does not match excluded paths", () => {
      const mockMatchPath = vi.mocked(matchPath);
      mockMatchPath.mockReturnValue(null);

      const result = isPathExcluded("/allowed", ["/excluded", "/other"]);

      expect(result).toBe(false);
    });

    it("should return false for empty excluded paths", () => {
      const result = isPathExcluded("/any-path", []);

      expect(result).toBe(false);
    });
  });

  describe("decodeUint8ToJson", () => {
    it("should decode valid Uint8Array to JSON", () => {
      const jsonString = '{"test": "value", "number": 123}';
      const uint8Array = new Uint8Array(Array.from(jsonString, char => char.charCodeAt(0)));

      const result = decodeUint8ToJson(uint8Array);

      expect(result).toEqual({ test: "value", number: 123 });
    });

    it("should return null for invalid JSON", () => {
      const invalidJson = '{"invalid": json}';
      const uint8Array = new Uint8Array(Array.from(invalidJson, char => char.charCodeAt(0)));

      const result = decodeUint8ToJson(uint8Array);

      expect(result).toBeNull();
    });

    it("should return null for non-Uint8Array input", () => {
      expect(decodeUint8ToJson("string")).toBeNull();
      expect(decodeUint8ToJson(123)).toBeNull();
      expect(decodeUint8ToJson({})).toBeNull();
      expect(decodeUint8ToJson(null)).toBeNull();
      expect(decodeUint8ToJson(undefined)).toBeNull();
    });

    it("should return null for empty Uint8Array", () => {
      const emptyArray = new Uint8Array(0);
      const result = decodeUint8ToJson(emptyArray);

      expect(result).toBeNull();
    });

    it("should handle large Uint8Array", () => {
      const largeJson = JSON.stringify({ data: "x".repeat(10000) });
      const uint8Array = new Uint8Array(Array.from(largeJson, char => char.charCodeAt(0)));

      const result = decodeUint8ToJson(uint8Array);

      expect(result).toEqual({ data: "x".repeat(10000) });
    });
  });
});
