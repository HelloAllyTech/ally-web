import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTalkPrivacyReload } from "../useTalkPrivacyReload";

describe("useTalkPrivacyReload", () => {
  const originalLocation = window.location;
  const reload = vi.fn();

  beforeEach(() => {
    reload.mockClear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, pathname: "/talk/acme", reload },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    document.head.innerHTML = "";
    try {
      window.sessionStorage.clear();
    } catch {
      // jsdom always has it; nothing to clean otherwise.
    }
  });

  it("does nothing on a clean /talk load", () => {
    const { result } = renderHook(() => useTalkPrivacyReload());
    expect(result.current).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads once when GTM was loaded by a page before in-app navigation", () => {
    const script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-ABC123";
    document.head.appendChild(script);

    const { result } = renderHook(() => useTalkPrivacyReload());
    expect(result.current).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
