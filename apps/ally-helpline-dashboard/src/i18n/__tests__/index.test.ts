import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const startDynamicI18nMock = vi.fn();

vi.mock("../dynamic", () => ({
  startDynamicI18n: startDynamicI18nMock,
}));

const setFlag = (value: boolean) => {
  vi.doMock("@ally-ui-mono/ui-shared/featureFlag", () => ({
    FEATURE_FLAGS_MAP: { LANGUAGE_SELECTOR_FLAG: value },
  }));
};

describe("i18n index gating", () => {
  beforeEach(() => {
    vi.resetModules();
    startDynamicI18nMock.mockReset();
  });

  afterEach(() => {
    vi.doUnmock("@ally-ui-mono/ui-shared/featureFlag");
  });

  it("does not start dynamic i18n when LANGUAGE_SELECTOR_FLAG is false", async () => {
    setFlag(false);

    await import("../index");
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(startDynamicI18nMock).not.toHaveBeenCalled();
  });

  it("starts dynamic i18n when LANGUAGE_SELECTOR_FLAG is true", async () => {
    setFlag(true);

    await import("../index");
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(startDynamicI18nMock).toHaveBeenCalledTimes(1);
  });
});
