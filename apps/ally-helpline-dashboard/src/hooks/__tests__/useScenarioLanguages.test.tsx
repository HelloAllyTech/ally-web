import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { useGetAvailableLanguagesQuery, useGetUserPreferencesQuery } from "../../api";
import { useScenarioLanguages } from "../useScenarioLanguages";
import { describe, it, expect, vi, afterEach, type Mock } from "vitest";
import { baseAPI } from "../../api/baseAPI";

// Mock the API calls
vi.mock("../../api", async () => {
  const actual = await vi.importActual("../../api");
  return {
    ...actual,
    useGetAvailableLanguagesQuery: vi.fn(),
    useGetUserPreferencesQuery: vi.fn(),
  };
});

// Create a test store with the API middleware
const createTestStore = () =>
  configureStore({
    reducer: {
      [baseAPI.reducerPath]: baseAPI.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
  });

describe("useScenarioLanguages", () => {
  const mockAvailableLanguages = [
    { language_id: 1, value: "en-IN", label: "English (India)" },
    { language_id: 2, value: "hi-IN", label: "Hindi (India)" },
  ];

  const mockPreferences = {
    data: {
      default_language_id: 1,
    },
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={createTestStore()}>{children}</Provider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle loading state", () => {
    (useGetAvailableLanguagesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    (useGetUserPreferencesQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

    expect(result.current).toEqual({
      languages: [],
      defaultLanguage: null,
      isLoading: true,
      error: null,
    });
  });

  // it("should handle error state", () => {
  //   const mockError = new Error("Failed to fetch");

  //   (useGetAvailableLanguagesQuery as jest.Mock).mockReturnValue({
  //     data: undefined,
  //     isLoading: false,
  //     error: mockError,
  //   });

  //   (useGetUserPreferencesQuery as jest.Mock).mockReturnValue({
  //     data: undefined,
  //     isLoading: false,
  //     error: null,
  //   });

  //   const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

  //   expect(result.current).toEqual({
  //     languages: [],
  //     defaultLanguage: null,
  //     isLoading: false,
  //     error: mockError,
  //   });
  // });

  // it("should return languages with default language from preferences", () => {
  //   (useGetAvailableLanguagesQuery as jest.Mock).mockReturnValue({
  //     data: mockAvailableLanguages,
  //     isLoading: false,
  //     error: null,
  //   });

  //   (useGetUserPreferencesQuery as jest.Mock).mockReturnValue({
  //     data: mockPreferences,
  //     isLoading: false,
  //     error: null,
  //   });

  //   const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

  //   expect(result.current).toEqual({
  //     languages: mockAvailableLanguages.map(lang => ({
  //       ...lang,
  //       value: lang.value,
  //       label: lang.label,
  //     })),
  //     defaultLanguage: {
  //       language_id: 1,
  //       value: "en-IN",
  //       label: "English (India)",
  //     },
  //     isLoading: false,
  //     error: null,
  //   });
  // });

  // it("should fallback to en-IN if preferred language not found", () => {
  //   (useGetAvailableLanguagesQuery as jest.Mock).mockReturnValue({
  //     data: mockAvailableLanguages,
  //     isLoading: false,
  //     error: null,
  //   });

  //   (useGetUserPreferencesQuery as jest.Mock).mockReturnValue({
  //     data: { data: { default_language_id: 999 } }, // Non-existent language ID
  //     isLoading: false,
  //     error: null,
  //   });

  //   const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

  //   expect(result.current.defaultLanguage).toEqual({
  //     language_id: 1,
  //     value: "en-IN",
  //     label: "English (India)",
  //   });
  // });

  // it("should handle empty languages array", () => {
  //   (useGetAvailableLanguagesQuery as jest.Mock).mockReturnValue({
  //     data: [],
  //     isLoading: false,
  //     error: null,
  //   });

  //   (useGetUserPreferencesQuery as jest.Mock).mockReturnValue({
  //     data: mockPreferences,
  //     isLoading: false,
  //     error: null,
  //   });

  //   const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

  //   expect(result.current).toEqual({
  //     languages: [],
  //     defaultLanguage: null,
  //     isLoading: false,
  //     error: null,
  //   });
  // });
});
