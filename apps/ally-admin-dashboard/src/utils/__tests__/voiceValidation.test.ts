import { describe, it, expect } from "vitest";

// Validation logic tests
describe("Voice Configuration Validation", () => {
  const validateConfiguration = (value: string): { isValid: boolean; error?: string } => {
    if (!value || value.trim() === "") {
      return { isValid: false, error: "Configuration cannot be empty" };
    }

    const trimmed = value.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      return {
        isValid: false,
        error: "Configuration must be a JSON object enclosed in curly braces {}",
      };
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return {
          isValid: false,
          error: "Configuration must be a JSON object, not an array or primitive",
        };
      }

      if (typeof parsed !== "object" || parsed === null) {
        return {
          isValid: false,
          error: "Configuration must be a JSON object, not an array or primitive",
        };
      }

      return { isValid: true };
    } catch {
      return { isValid: false, error: "Invalid JSON syntax" };
    }
  };

  describe("Empty Configuration", () => {
    it("should reject empty string", () => {
      const result = validateConfiguration("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Configuration cannot be empty");
    });

    it("should reject whitespace-only string", () => {
      const result = validateConfiguration("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Configuration cannot be empty");
    });

    it("should reject null", () => {
      const result = validateConfiguration("");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Bracket Validation", () => {
    it("should reject configuration without opening brace", () => {
      const result = validateConfiguration('"key": "value"}');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("curly braces");
    });

    it("should reject configuration without closing brace", () => {
      const result = validateConfiguration('{"key": "value"');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("curly braces");
    });

    it("should reject configuration with only opening brace", () => {
      const result = validateConfiguration("{");
      expect(result.isValid).toBe(false);
    });

    it("should reject plain text without braces", () => {
      const result = validateConfiguration("plain text");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("curly braces");
    });
  });

  describe("JSON Syntax Validation", () => {
    it("should reject invalid JSON with trailing comma", () => {
      const result = validateConfiguration('{"key": "value",}');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid JSON syntax");
    });

    it("should reject invalid JSON with single quotes", () => {
      const result = validateConfiguration("{'key': 'value'}");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid JSON syntax");
    });

    it("should reject invalid JSON with unquoted keys", () => {
      const result = validateConfiguration("{key: value}");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid JSON syntax");
    });

    it("should reject malformed JSON", () => {
      const result = validateConfiguration('{"key": invalid}');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid JSON syntax");
    });

    it("should reject JSON with missing quotes", () => {
      const result = validateConfiguration('{"key": value}');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid JSON syntax");
    });
  });

  describe("Type Validation", () => {
    it("should reject array configuration", () => {
      const result = validateConfiguration("[1, 2, 3]");
      expect(result.isValid).toBe(false);
      // Arrays don't start with { so they fail bracket check first
      expect(result.error).toContain("curly braces");
    });

    it("should reject primitive string value", () => {
      const result = validateConfiguration('"just a string"');
      expect(result.isValid).toBe(false);
    });

    it("should reject primitive number value", () => {
      const result = validateConfiguration("123");
      expect(result.isValid).toBe(false);
    });

    it("should reject null value", () => {
      const result = validateConfiguration("null");
      expect(result.isValid).toBe(false);
    });

    it("should reject boolean value", () => {
      const result = validateConfiguration("true");
      expect(result.isValid).toBe(false);
    });
  });

  describe("Valid Configuration", () => {
    it("should accept empty object", () => {
      const result = validateConfiguration("{}");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept simple object", () => {
      const result = validateConfiguration('{"key": "value"}');
      expect(result.isValid).toBe(true);
    });

    it("should accept object with multiple properties", () => {
      const result = validateConfiguration(
        '{"model": "neural", "age": "adult", "gender": "female"}',
      );
      expect(result.isValid).toBe(true);
    });

    it("should accept nested object", () => {
      const result = validateConfiguration('{"settings": {"pitch": 1.0, "rate": 1.2}}');
      expect(result.isValid).toBe(true);
    });

    it("should accept object with numeric values", () => {
      const result = validateConfiguration('{"age": 25, "level": 5}');
      expect(result.isValid).toBe(true);
    });

    it("should accept object with boolean values", () => {
      const result = validateConfiguration('{"active": true, "verified": false}');
      expect(result.isValid).toBe(true);
    });

    it("should accept object with array values", () => {
      const result = validateConfiguration('{"tags": ["voice", "audio"], "numbers": [1, 2, 3]}');
      expect(result.isValid).toBe(true);
    });

    it("should accept object with null values", () => {
      const result = validateConfiguration('{"optional": null}');
      expect(result.isValid).toBe(true);
    });

    it("should accept object with whitespace", () => {
      const result = validateConfiguration('  {"key": "value"}  ');
      expect(result.isValid).toBe(true);
    });

    it("should accept object with newlines and indentation", () => {
      const result = validateConfiguration(`{
        "model": "neural",
        "settings": {
          "pitch": 1.0
        }
      }`);
      expect(result.isValid).toBe(true);
    });

    it("should accept voice-specific configuration", () => {
      const result = validateConfiguration(
        '{"voiceId": "google-us-en-a", "model": "neural", "age": "adult", "gender": "female"}',
      );
      expect(result.isValid).toBe(true);
    });

    it("should accept minimal valid configuration", () => {
      const result = validateConfiguration('{"name": "default"}');
      expect(result.isValid).toBe(true);
    });
  });

  describe("Whitespace Handling", () => {
    it("should trim leading whitespace", () => {
      const result = validateConfiguration('  {"key": "value"}');
      expect(result.isValid).toBe(true);
    });

    it("should trim trailing whitespace", () => {
      const result = validateConfiguration('{"key": "value"}  ');
      expect(result.isValid).toBe(true);
    });

    it("should preserve internal whitespace", () => {
      const result = validateConfiguration('{"key": "value with spaces"}');
      expect(result.isValid).toBe(true);
    });

    it("should handle tabs", () => {
      const result = validateConfiguration('{\t"key": "value"\t}');
      expect(result.isValid).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle Unicode characters in values", () => {
      const result = validateConfiguration('{"language": "español"}');
      expect(result.isValid).toBe(true);
    });

    it("should handle special characters in values", () => {
      const result = validateConfiguration('{"symbol": "!@#$%"}');
      expect(result.isValid).toBe(true);
    });

    it("should handle very large objects", () => {
      const largeObj =
        '{"' +
        Array(100)
          .fill(0)
          .map((_, i) => `key${i}`)
          .join('": 1, "') +
        '": 1}';
      const result = validateConfiguration(largeObj);
      expect(result.isValid).toBe(true);
    });

    it("should handle deeply nested objects", () => {
      const deepObj = '{"a": {"b": {"c": {"d": {"e": "value"}}}}}';
      const result = validateConfiguration(deepObj);
      expect(result.isValid).toBe(true);
    });

    it("should handle escaped quotes in strings", () => {
      const result = validateConfiguration('{"quote": "say \\"hello\\""}');
      expect(result.isValid).toBe(true);
    });

    it("should handle empty strings as values", () => {
      const result = validateConfiguration('{"key": ""}');
      expect(result.isValid).toBe(true);
    });
  });
});
