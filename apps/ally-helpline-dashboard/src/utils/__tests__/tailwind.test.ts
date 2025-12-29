import { describe, it, expect } from "vitest";

import { cn } from "../tailwind";

describe("tailwind utils", () => {
  describe("cn", () => {
    it("should merge class names correctly", () => {
      const result = cn("px-2 py-1", "bg-red-500");
      expect(result).toBe("px-2 py-1 bg-red-500");
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class");
      expect(result).toBe("base-class active-class");
    });

    it("should handle false conditional classes", () => {
      const isActive = false;
      const result = cn("base-class", isActive && "active-class");
      expect(result).toBe("base-class");
    });

    it("should handle multiple conditional classes", () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn("base-class", isActive && "active-class", isDisabled && "disabled-class");
      expect(result).toBe("base-class active-class");
    });

    it("should handle empty strings and null values", () => {
      const result = cn("base-class", "", null, undefined);
      expect(result).toBe("base-class");
    });

    it("should handle arrays of classes", () => {
      const result = cn(["px-2", "py-1"], "bg-red-500");
      expect(result).toBe("px-2 py-1 bg-red-500");
    });

    it("should handle objects with boolean values", () => {
      const result = cn({
        "base-class": true,
        "active-class": true,
        "disabled-class": false,
      });
      expect(result).toBe("base-class active-class");
    });

    it("should handle complex combinations", () => {
      const isActive = true;
      const isDisabled = false;
      const result = cn(
        "base-class",
        {
          "active-class": isActive,
          "disabled-class": isDisabled,
        },
        ["px-2", "py-1"],
        isActive && "extra-class",
      );
      expect(result).toBe("base-class active-class px-2 py-1 extra-class");
    });

    it("should handle Tailwind CSS conflicts correctly", () => {
      // This tests that tailwind-merge is working correctly
      const result = cn("px-2 px-4", "py-1 py-3");
      // The result should have the last conflicting class
      expect(result).toBe("px-4 py-3");
    });

    it("should handle no arguments", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should handle single argument", () => {
      const result = cn("single-class");
      expect(result).toBe("single-class");
    });
  });
});
