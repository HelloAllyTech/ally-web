import { afterEach, describe, expect, it, vi } from "vitest";

import { HelplineSettings } from "@src/types";

import {
  DEFAULT_CONSUMER_APP_URL,
  buildPublicLink,
  getApiErrorMessage,
  getConsumerAppUrl,
  getTimezoneOptions,
  isSettingsDirty,
  normaliseSettings,
  sortLanguages,
  validateSettings,
} from "../helpers";

// The real copy, without the real `@src/constants` barrel (see TextHelplineSettings.test.tsx).
vi.mock("@src/constants", async () => ({
  en: (await import("@src/constants/en")).en,
}));

const settings = (overrides: Partial<HelplineSettings> = {}): HelplineSettings => ({
  retentionDays: 90,
  hours: null,
  languages: ["en", "hi"],
  allowQueueWhenNoListeners: false,
  maxWaitMinutes: 30,
  idleEndMinutes: 15,
  maxWaitingTalkers: 50,
  orgMaxConcurrentPerListener: 3,
  emergencyResources: { en: "Call 112", hi: "112 पर कॉल करें" },
  closingMessage: {},
  escalationChecklist: ["Ask directly"],
  supervisorAlertChannels: { inApp: true, push: true, slackWebhookUrl: null },
  listenerSupportContact: null,
  ageNotice: null,
  copilot: { suggestions: true, nudges: true, riskClassifier: true, rollingSummaryEveryTurns: 4 },
  riskHighConfidence: 0.7,
  summaryFields: [{ key: "next_step", label: "Next step", description: "" }],
  ...overrides,
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getConsumerAppUrl", () => {
  it("reads the origin lazily and strips trailing slashes", () => {
    vi.stubEnv("VITE_IMPERSONATION_APP_URL", "https://consumer.example.test///");
    expect(getConsumerAppUrl()).toBe("https://consumer.example.test");

    vi.stubEnv("VITE_IMPERSONATION_APP_URL", "http://localhost:3000/");
    expect(getConsumerAppUrl()).toBe("http://localhost:3000");
  });

  it("falls back when unset or blank", () => {
    vi.stubEnv("VITE_IMPERSONATION_APP_URL", "");
    expect(getConsumerAppUrl()).toBe(DEFAULT_CONSUMER_APP_URL);

    vi.stubEnv("VITE_IMPERSONATION_APP_URL", "   ");
    expect(getConsumerAppUrl()).toBe(DEFAULT_CONSUMER_APP_URL);
  });

  it("joins the origin and the server's path with exactly one slash", () => {
    vi.stubEnv("VITE_IMPERSONATION_APP_URL", "https://consumer.example.test/");
    expect(buildPublicLink("/talk/acme")).toBe("https://consumer.example.test/talk/acme");
  });
});

describe("getTimezoneOptions", () => {
  it("puts Asia/Kolkata first and never lists a zone twice", () => {
    const zones = getTimezoneOptions();
    expect(zones[0]).toBe("Asia/Kolkata");
    expect(new Set(zones).size).toBe(zones.length);
    expect(zones).toContain("UTC");
  });

  it("keeps a saved zone the list doesn't know", () => {
    expect(getTimezoneOptions("Mars/Olympus_Mons")[0]).toBe("Mars/Olympus_Mons");
  });

  it("falls back to a short list when the engine has no Intl.supportedValuesOf", () => {
    const original = (Intl as any).supportedValuesOf;
    (Intl as any).supportedValuesOf = undefined;
    try {
      const zones = getTimezoneOptions();
      expect(zones[0]).toBe("Asia/Kolkata");
      expect(zones.length).toBeGreaterThan(5);
      expect(zones.length).toBeLessThan(40);
    } finally {
      (Intl as any).supportedValuesOf = original;
    }
  });
});

describe("sortLanguages", () => {
  it("orders known languages first, then unfamiliar codes, without duplicates", () => {
    expect(sortLanguages(["kn", "bn", "en", "en", "ar", "hi"])).toEqual([
      "en",
      "hi",
      "kn",
      "ar",
      "bn",
    ]);
  });
});

describe("normaliseSettings and isSettingsDirty", () => {
  it("ignores key order, stray spaces and blank-versus-null", () => {
    const server = settings();
    const form = settings({
      ageNotice: "  ",
      listenerSupportContact: "",
      emergencyResources: { hi: "112 पर कॉल करें ", en: " Call 112" },
      supervisorAlertChannels: { inApp: true, push: true, slackWebhookUrl: "" },
    });
    expect(isSettingsDirty(form, server)).toBe(false);
  });

  it("ignores text kept for a language that is no longer offered", () => {
    const form = settings({
      languages: ["en"],
      emergencyResources: { en: "Call 112", hi: "left over" },
    });
    expect(normaliseSettings(form).emergencyResources).toEqual({ en: "Call 112" });
  });

  it("drops blank closing messages and keeps real ones", () => {
    const form = settings({ closingMessage: { en: "Take care", hi: "   " } });
    expect(normaliseSettings(form).closingMessage).toEqual({ en: "Take care" });
  });

  it("sorts opening windows Monday first, with Sunday last", () => {
    const form = settings({
      hours: {
        tz: "Asia/Kolkata",
        weekly: [
          { day: 0, open: "10:00", close: "12:00" },
          { day: 3, open: "09:00", close: "17:00" },
          { day: 1, open: "09:00", close: "17:00" },
        ],
      },
    });
    expect(normaliseSettings(form).hours?.weekly.map(w => w.day)).toEqual([1, 3, 0]);
  });

  it("notices a real change", () => {
    expect(isSettingsDirty(settings({ maxWaitMinutes: 31 }), settings())).toBe(true);
    expect(isSettingsDirty(settings({ escalationChecklist: ["a", "b"] }), settings())).toBe(true);
    expect(
      isSettingsDirty(settings({ copilot: { ...settings().copilot, nudges: false } }), settings()),
    ).toBe(true);
  });

  it("does not mutate what it is given", () => {
    const form = settings({ ageNotice: " x " });
    const before = JSON.stringify(form);
    normaliseSettings(form);
    expect(JSON.stringify(form)).toBe(before);
  });
});

describe("validateSettings", () => {
  it("passes the platform defaults' shape", () => {
    expect(validateSettings(settings())).toEqual({});
  });

  it("accepts the limits themselves", () => {
    expect(
      validateSettings(
        settings({
          maxWaitMinutes: 1,
          idleEndMinutes: 120,
          maxWaitingTalkers: 500,
          orgMaxConcurrentPerListener: 10,
          retentionDays: 0,
          riskHighConfidence: 0.5,
          copilot: { ...settings().copilot, rollingSummaryEveryTurns: 20 },
        }),
      ),
    ).toEqual({});
    expect(validateSettings(settings({ riskHighConfidence: 0.95 }))).toEqual({});
  });

  it("rejects fractions, NaN and out-of-range limits", () => {
    const errors = validateSettings(
      settings({
        maxWaitMinutes: 2.5,
        idleEndMinutes: 121,
        maxWaitingTalkers: NaN,
        orgMaxConcurrentPerListener: 0,
        retentionDays: -3,
        riskHighConfidence: 0.49,
      }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      "idleEndMinutes",
      "maxWaitMinutes",
      "maxWaitingTalkers",
      "orgMaxConcurrentPerListener",
      "retentionDays",
      "riskHighConfidence",
    ]);
  });

  it("requires resources per offered language, by whitespace-aware check", () => {
    const errors = validateSettings(settings({ emergencyResources: { en: "ok", hi: "  " } }));
    expect(Object.keys(errors)).toEqual(["emergencyResources.hi"]);
  });

  it("requires a timezone and well-formed, ordered times when hours are set", () => {
    const errors = validateSettings(
      settings({
        hours: {
          tz: "",
          weekly: [
            { day: 1, open: "17:00", close: "09:00" },
            { day: 2, open: "", close: "17:00" },
            { day: 3, open: "09:00", close: "09:00" },
            { day: 4, open: "09:00", close: "17:00" },
          ],
        },
      }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      "hours.day.1",
      "hours.day.2",
      "hours.day.3",
      "hours.tz",
    ]);
  });

  it("flags hours with no open day", () => {
    expect(validateSettings(settings({ hours: { tz: "UTC", weekly: [] } }))).toHaveProperty(
      "hours",
    );
  });

  it("accepts only an https://hooks.slack.com/ webhook, or none", () => {
    const withSlack = (slackWebhookUrl: string | null) =>
      validateSettings(
        settings({ supervisorAlertChannels: { inApp: true, push: true, slackWebhookUrl } }),
      );
    expect(withSlack(null)).toEqual({});
    expect(withSlack("")).toEqual({});
    expect(withSlack("https://hooks.slack.com/services/T0/B0/x")).toEqual({});
    expect(withSlack("http://hooks.slack.com/services/x")).toHaveProperty("slackWebhookUrl");
    expect(withSlack("https://hooks.slack.com.evil.test/x")).toHaveProperty("slackWebhookUrl");
    expect(withSlack("http://example.com")).toHaveProperty("slackWebhookUrl");
  });

  it("checks summary field keys and labels", () => {
    const errors = validateSettings(
      settings({
        summaryFields: [
          { key: "ok_key", label: "Fine", description: "" },
          { key: "1bad", label: "Fine", description: "" },
          { key: "Upper", label: "Fine", description: "" },
          { key: "", label: "", description: "" },
          { key: "ok_key", label: "Again", description: "" },
        ],
      }),
    );
    expect(Object.keys(errors).sort()).toEqual([
      "summaryFields.0.key",
      "summaryFields.1.key",
      "summaryFields.2.key",
      "summaryFields.3.key",
      "summaryFields.3.label",
      "summaryFields.4.key",
    ]);
  });
});

describe("getApiErrorMessage", () => {
  it("prefers the server's message, joins a list, and otherwise falls back", () => {
    expect(getApiErrorMessage({ data: { message: "Nope" } }, "fallback")).toBe("Nope");
    expect(getApiErrorMessage({ data: { message: ["a", "b"] } }, "fallback")).toBe("a b");
    expect(getApiErrorMessage({ data: { message: "  " } }, "fallback")).toBe("fallback");
    expect(getApiErrorMessage({ status: 500 }, "fallback")).toBe("fallback");
    expect(getApiErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
