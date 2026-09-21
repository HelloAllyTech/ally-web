import { describe, it, expect, vi } from "vitest";

import { syncLiveTabEnabledWithExperienceMode, FORM_FIELD_IDS } from "@constants";

describe("syncLiveTabEnabledWithExperienceMode", () => {
  const buildFormMethods = () => ({ setValue: vi.fn() }) as any;

  it("turns Live Events on for FEEDBACK", () => {
    const formMethods = buildFormMethods();
    syncLiveTabEnabledWithExperienceMode("FEEDBACK", formMethods);

    expect(formMethods.setValue).toHaveBeenCalledWith(FORM_FIELD_IDS.LIVE_TAB_ENABLED, true, {
      shouldDirty: true,
    });
  });

  it("turns Live Events on for CHECKLIST", () => {
    const formMethods = buildFormMethods();
    syncLiveTabEnabledWithExperienceMode("CHECKLIST", formMethods);

    expect(formMethods.setValue).toHaveBeenCalledWith(FORM_FIELD_IDS.LIVE_TAB_ENABLED, true, {
      shouldDirty: true,
    });
  });

  it("turns Live Events off for NONE", () => {
    const formMethods = buildFormMethods();
    syncLiveTabEnabledWithExperienceMode("NONE", formMethods);

    expect(formMethods.setValue).toHaveBeenCalledWith(FORM_FIELD_IDS.LIVE_TAB_ENABLED, false, {
      shouldDirty: true,
    });
  });

  it("marks the write as dirty so autosave picks it up", () => {
    const formMethods = buildFormMethods();
    syncLiveTabEnabledWithExperienceMode("NONE", formMethods);

    const [, , options] = formMethods.setValue.mock.calls[0];
    expect(options).toEqual({ shouldDirty: true });
  });
});
