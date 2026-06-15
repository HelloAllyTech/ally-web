import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useResolvedPrimaryLanguageId } from "../useResolvedPrimaryLanguageId";

const catalog = [
  { language_id: 1, value: "en-IN", label: "English (India)", voices: [] },
  { language_id: 2, value: "hi-IN", label: "Hindi (India)", voices: [] },
  { language_id: 3, value: "ml-IN", label: "Malayalam", voices: [] },
];

describe("useResolvedPrimaryLanguageId", () => {
  it("returns the overrideLanguageId when provided", () => {
    const { result } = renderHook(() => useResolvedPrimaryLanguageId(catalog, 2));
    expect(result.current).toBe("2");
  });

  it("finds English by value when no override is given", () => {
    const { result } = renderHook(() => useResolvedPrimaryLanguageId(catalog, null));
    expect(result.current).toBe("1");
  });

  it("finds English by translationCode when value does not contain 'en'", () => {
    const catalogWithCode = [
      { language_id: 5, value: "xyz", translationCode: "en", label: "English", voices: [] },
      { language_id: 6, value: "hi-IN", label: "Hindi", voices: [] },
    ];
    const { result } = renderHook(() =>
      useResolvedPrimaryLanguageId(catalogWithCode as any, undefined),
    );
    expect(result.current).toBe("5");
  });

  it("falls back to first catalog language if no English found", () => {
    const noEnglish = [
      { language_id: 10, value: "hi-IN", label: "Hindi", voices: [] },
      { language_id: 11, value: "ml-IN", label: "Malayalam", voices: [] },
    ];
    const { result } = renderHook(() => useResolvedPrimaryLanguageId(noEnglish, null));
    expect(result.current).toBe("10");
  });

  it("returns null when catalog is empty and no override", () => {
    const { result } = renderHook(() => useResolvedPrimaryLanguageId([], null));
    expect(result.current).toBeNull();
  });
});
