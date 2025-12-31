import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { logger, LogLevel } from "../logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if ((vi as any).unstubAllEnvs) (vi as any).unstubAllEnvs();
  });

  afterEach(() => {
    if ((vi as any).unstubAllEnvs) (vi as any).unstubAllEnvs();
  });

  it("logs with timestamp and level in development", () => {
    vi.stubEnv("MODE", "development");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.log(LogLevel.INFO, "hello");
    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0][0] as string;
    expect(call).toMatch(/\[.*\] \[INFO\] hello/);
  });

  it("does not log outside development", () => {
    vi.stubEnv("MODE", "production");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hidden");
    expect(spy).not.toHaveBeenCalled();
  });

  it("proxies to level-specific helpers", () => {
    vi.stubEnv("MODE", "development");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.error("e");
    logger.warn("w");
    logger.debug("d");
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
