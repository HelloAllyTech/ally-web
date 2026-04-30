import { waitFor } from "@testing-library/react";
import type { i18n as I18nInstance } from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startDynamicI18n } from "../dynamic";

const createI18n = (language = "en-US") =>
  ({
    language,
    resolvedLanguage: language,
    addResourceBundle: vi.fn(),
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  }) as unknown as I18nInstance;

const jsonResponse = (body: unknown) => ({
  ok: true,
  json: vi.fn().mockResolvedValue(body),
});

const storage = (() => {
  let values: Record<string, string> = {};

  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => {
      values[key] = value;
    },
    removeItem: (key: string) => {
      delete values[key];
    },
    clear: () => {
      values = {};
    },
  };
})();

describe("startDynamicI18n", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storage,
    });
    vi.stubEnv("VITE_I18N_BASE_URL", "http://localhost:8090");
    vi.stubGlobal("fetch", vi.fn());
    localStorage.clear();
    delete (window as unknown as Record<string, unknown>).__allyDynamicI18nStarted;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    localStorage.clear();
    delete (window as unknown as Record<string, unknown>).__allyDynamicI18nStarted;
  });

  it("keeps the default test-mode guard in place", () => {
    const i18n = createI18n();

    startDynamicI18n(i18n);

    expect(fetch).not.toHaveBeenCalled();
    expect(i18n.addResourceBundle).not.toHaveBeenCalled();
  });

  it("fetches the manifest and applies the current versioned resources", async () => {
    const manifest = {
      version: 42,
      currentVersion: "v42",
      publishedAt: "2026-04-29T04:20:00.000Z",
      languages: ["en", "kn"],
      namespaces: ["common"],
    };
    const resource = { title: "Published title" };
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(manifest) as Response)
      .mockResolvedValueOnce(jsonResponse(resource) as Response);
    const i18n = createI18n();

    startDynamicI18n(i18n, { force: true, disablePolling: true });

    await waitFor(() => {
      expect(i18n.addResourceBundle).toHaveBeenCalledWith(
        "en",
        "translation",
        { common: resource },
        true,
        true,
      );
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "http://localhost:8090/manifest.json", {
      cache: "no-cache",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:8090/v42/en/common.json", {
      cache: "force-cache",
    });
    expect(localStorage.getItem("ally:i18n:version")).toBe("v42");
    expect(JSON.parse(localStorage.getItem("ally:i18n:v42:en") ?? "{}")).toEqual({
      common: resource,
    });
  });

  it("applies the cached resource when the manifest cannot be fetched", async () => {
    const cachedResource = { common: { title: "Cached title" } };
    localStorage.setItem("ally:i18n:version", "v41");
    localStorage.setItem("ally:i18n:v41:en", JSON.stringify(cachedResource));
    vi.mocked(fetch).mockRejectedValue(new Error("i18n server down"));
    const i18n = createI18n();

    startDynamicI18n(i18n, { force: true, disablePolling: true });

    await waitFor(() => {
      expect(i18n.addResourceBundle).toHaveBeenCalledWith(
        "en",
        "translation",
        cachedResource,
        true,
        true,
      );
    });
    expect(i18n.changeLanguage).toHaveBeenCalledWith("en-US");
  });
});
