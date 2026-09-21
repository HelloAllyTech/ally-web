import { afterEach, describe, expect, it, vi } from "vitest";

import { detectDeviceOs } from "../detectDeviceOs";

const setUserAgent = (ua: string) => {
  vi.stubGlobal("navigator", { userAgent: ua });
};

describe("detectDeviceOs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads a desktop macOS user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    );
    expect(detectDeviceOs()).toEqual({ os: "Mac OS X 10.15.7", device: "Desktop" });
  });

  it("reads a mobile Android user agent", () => {
    setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile");
    expect(detectDeviceOs()).toEqual({ os: "Android 14", device: "Mobile" });
  });

  it("reads an iPhone user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    );
    expect(detectDeviceOs()).toEqual({ os: "iPhone OS 17.5", device: "Mobile" });
  });

  it("returns an empty object when navigator is unavailable", () => {
    vi.stubGlobal("navigator", undefined);
    expect(detectDeviceOs()).toEqual({});
  });
});
