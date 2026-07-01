import React from "react";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { baseAPI } from "../../api/baseAPI";
import userSlice from "../../reducer/userReducer";

// Use vi.hoisted for mocks that need to be available in vi.mock factory
const { mockUseGetAvailableLanguagesQuery, mockUseGetUserPreferencesQuery } = vi.hoisted(() => ({
  mockUseGetAvailableLanguagesQuery: vi.fn(),
  mockUseGetUserPreferencesQuery: vi.fn(),
}));

// Mock the API calls - mock the actual import paths used by the hook
vi.mock("../../api/learn", () => ({
  useGetAvailableLanguagesQuery: () => mockUseGetAvailableLanguagesQuery(),
}));

vi.mock("../../api/user", () => ({
  useGetUserPreferencesQuery: () => mockUseGetUserPreferencesQuery(),
  useLazyGetUserPreferencesQuery: () => [
    vi.fn().mockResolvedValue({ data: { data: {} } }),
    { isLoading: false },
  ],
  useUpdateUserPreferencesMutation: () => [vi.fn()],
}));

import { useScenarioLanguages } from "../useScenarioLanguages";

const testStore = configureStore({
  reducer: {
    [baseAPI.reducerPath]: baseAPI.reducer,
    user: userSlice.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
  preloadedState: {
    user: {
      isAuthenticated: false,
      user: null,
      permissions: [],
      availableChatTypes: [],
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={testStore}>{children}</Provider>
);

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    testStore.dispatch(baseAPI.util.resetApiState());
  });

  it("should handle loading state", () => {
    mockUseGetAvailableLanguagesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    mockUseGetUserPreferencesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

    expect(result.current.languages).toEqual([]);
    expect(result.current.defaultLanguage).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should handle error state", () => {
    const mockError = new Error("Failed to fetch");

    mockUseGetAvailableLanguagesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    mockUseGetUserPreferencesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

    expect(result.current.languages).toEqual([]);
    expect(result.current.defaultLanguage).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(mockError);
  });

  it("should return languages with default language from preferences", () => {
    mockUseGetAvailableLanguagesQuery.mockReturnValue({
      data: mockAvailableLanguages,
      isLoading: false,
      error: null,
    });

    mockUseGetUserPreferencesQuery.mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

    expect(result.current.languages).toHaveLength(2);
    expect(result.current.defaultLanguage).toMatchObject({
      language_id: 1,
      value: "en-IN",
      label: "English (India)",
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should fallback to en-IN if preferred language not found", () => {
    mockUseGetAvailableLanguagesQuery.mockReturnValue({
      data: mockAvailableLanguages,
      isLoading: false,
      error: null,
    });

    mockUseGetUserPreferencesQuery.mockReturnValue({
      data: { data: { default_language_id: 999 } }, // Non-existent language ID
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

    expect(result.current.defaultLanguage).toMatchObject({
      language_id: 1,
      value: "en-IN",
      label: "English (India)",
    });
  });

  it("should handle empty languages array", () => {
    mockUseGetAvailableLanguagesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    mockUseGetUserPreferencesQuery.mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useScenarioLanguages(), { wrapper });

    expect(result.current.languages).toEqual([]);
    expect(result.current.defaultLanguage).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
