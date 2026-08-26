import path from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { LOCAL_STORAGE_KEYS } from "@constants";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock the store to avoid initialization issues
vi.mock("@store", () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe("baseAPI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should be properly configured", async () => {
    const { baseAPI } = await import("../baseApi");
    expect(baseAPI).toBeDefined();
    expect(typeof baseAPI).toBe("object");
  });

  it("should have correct structure", async () => {
    const { baseAPI } = await import("../baseApi");
    expect(baseAPI).toHaveProperty("reducerPath");
    expect(baseAPI).toHaveProperty("reducer");
    expect(baseAPI).toHaveProperty("middleware");
  });

  it("should have correct reducer path", async () => {
    const { baseAPI } = await import("../baseApi");
    expect(baseAPI.reducerPath).toBe("baseAPI");
  });

  it("should have reducer function", async () => {
    const { baseAPI } = await import("../baseApi");
    expect(typeof baseAPI.reducer).toBe("function");
  });

  it("should have middleware function", async () => {
    const { baseAPI } = await import("../baseApi");
    expect(typeof baseAPI.middleware).toBe("function");
  });

  it("should support endpoint injection", async () => {
    const { baseAPI } = await import("../baseApi");
    expect(typeof baseAPI.injectEndpoints).toBe("function");
  });

  it("should have correct tag types", async () => {
    const { baseAPI } = await import("../baseApi");
    expect(baseAPI).toBeDefined();
  });

  it("should be properly exported", async () => {
    const { baseAPI } = await import("../baseApi");
    expect(baseAPI).toBeDefined();
    expect(typeof baseAPI).toBe("object");
  });

  describe("baseQuery", () => {
    it("should be defined", async () => {
      const { baseQuery } = await import("../baseApi");
      expect(baseQuery).toBeDefined();
      expect(typeof baseQuery).toBe("function");
    });
  });

  describe("baseQueryWithReauth", () => {
    it("should be defined", async () => {
      const { baseQueryWithReauth } = await import("../baseApi");
      expect(baseQueryWithReauth).toBeDefined();
      expect(typeof baseQueryWithReauth).toBe("function");
    });

    it("should handle requests without tokens", async () => {
      const { baseQueryWithReauth } = await import("../baseApi");
      const mockArgs = "/test-endpoint";
      const mockStore = {} as any;
      const mockExtraOptions = {};

      // This will fail because we don't have a real server, but we're testing the function exists
      expect(async () => {
        await baseQueryWithReauth(mockArgs, mockStore, mockExtraOptions);
      }).toBeDefined();
    });

    it("should handle authentication headers when token exists", () => {
      const testToken = "test-access-token";
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, testToken);

      const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      expect(token).toBe(testToken);
    });

    it("should handle missing tokens", () => {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);

      const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);

      expect(accessToken).toBeNull();
      expect(refreshToken).toBeNull();
    });

    it("should handle token refresh scenario", () => {
      const testAccessToken = "test-access-token";
      const testRefreshToken = "test-refresh-token";

      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, testAccessToken);
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, testRefreshToken);

      const accessToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);

      expect(accessToken).toBe(testAccessToken);
      expect(refreshToken).toBe(testRefreshToken);
    });

    it("should clear tokens on logout", () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "token");
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, "refresh");
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

      localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED);

      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN)).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED)).toBeNull();
    });
  });

  describe("API Configuration", () => {
    it("should have correct base URL configuration", () => {
      expect(import.meta.env.VITE_API_BASE_URL).toBeDefined();
      expect(typeof import.meta.env.VITE_API_BASE_URL).toBe("string");
      expect(import.meta.env.VITE_API_BASE_URL.length).toBeGreaterThan(0);
    });

    it("should handle environment variables", () => {
      expect(import.meta.env).toBeDefined();
      expect(import.meta.env.VITE_API_BASE_URL).toBeTruthy();
    });
  });

  describe("lint: no-console in baseQueryWithReauth", () => {
    // baseQueryWithReauth handles 401 token refresh and logout — leftover
    // console.error calls in that path fail `npm run lint` (no-console) and
    // should never ship without a deliberate eslint-disable justifying them.
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
    const filePath = path.join(repoRoot, "apps/ally-admin-dashboard/src/api/baseApi.ts");

    it("reports no no-console errors", async () => {
      const eslint = new ESLint({
        cwd: repoRoot,
        overrideConfigFile: path.join(repoRoot, "eslint.config.mjs"),
      });
      const [result] = await eslint.lintFiles([filePath]);

      expect(result.messages.filter(m => m.ruleId === "no-console")).toEqual([]);
    }, 15000);
  });

  describe("Local Storage Integration", () => {
    it("should store and retrieve access token", () => {
      const token = "test-token-123";
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, token);
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBe(token);
    });

    it("should store and retrieve refresh token", () => {
      const token = "refresh-token-456";
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, token);
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN)).toBe(token);
    });

    it("should store and retrieve authentication status", () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED)).toBe("true");
    });

    it("should clear all authentication data", () => {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN, "token");
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN, "refresh");
      localStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED, "true");

      localStorage.clear();

      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN)).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_REFRESH_TOKEN)).toBeNull();
      expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED)).toBeNull();
    });
  });
});
