import { en } from "@src/constants";
import { HelplineHours, HelplineSettings, HelplineWeekday } from "@src/types";

/** Where talkers open the public link when the deployment doesn't say otherwise. */
export const DEFAULT_CONSUMER_APP_URL = "https://app.helloally.ai";

/**
 * Origin of the consumer (talker) app, no trailing slash.
 *
 * Read inside the function, never at module load: this file is imported through barrels by suites
 * that mock `@constants` wholesale, and the admin console's convention is that shared modules do no
 * work at import time (see ally-web's CLAUDE.md).
 */
export const getConsumerAppUrl = (): string => {
  const raw: unknown = import.meta.env.VITE_IMPERSONATION_APP_URL;
  const origin = typeof raw === "string" ? raw.trim().replace(/\/+$/, "") : "";
  return origin || DEFAULT_CONSUMER_APP_URL;
};

export const buildPublicLink = (publicPath: string): string =>
  `${getConsumerAppUrl()}${publicPath}`;

/** Weekdays in the order an admin reads them (Monday first); values follow `Date#getDay`. */
export const WEEKDAYS_MONDAY_FIRST: HelplineWeekday[] = [1, 2, 3, 4, 5, 6, 0];

export const dayName = (day: HelplineWeekday): string => en.textHelpline.days[day];

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** Hours an admin starts from when they first choose "Set opening hours". */
export const buildDefaultHours = (): HelplineHours => ({
  tz: DEFAULT_TIMEZONE,
  weekly: ([1, 2, 3, 4, 5] as HelplineWeekday[]).map(day => ({
    day,
    open: "09:00",
    close: "17:00",
  })),
});

/** Languages the console can name. Anything else already saved still shows, by its code. */
export const KNOWN_LANGUAGE_CODES = ["en", "hi", "mr", "ta", "kn"];

export const languageName = (code: string): string =>
  en.textHelpline.languageNames[code] ?? code.toUpperCase();

/** Known languages in their fixed order, then any unfamiliar codes alphabetically. */
export const sortLanguages = (codes: string[]): string[] => {
  const rank = (code: string) => {
    const index = KNOWN_LANGUAGE_CODES.indexOf(code);
    return index === -1 ? KNOWN_LANGUAGE_CODES.length : index;
  };
  return [...new Set(codes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
};

const FALLBACK_TIMEZONES = [
  DEFAULT_TIMEZONE,
  "UTC",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Kathmandu",
  "Asia/Colombo",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Paris",
  "Africa/Nairobi",
  "Africa/Lagos",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
];

/**
 * IANA zones for the timezone select: `Asia/Kolkata` first, then everything the browser knows, with
 * a short fixed list as the fallback where `Intl.supportedValuesOf` is missing. The saved zone is
 * always included so an unusual one never silently becomes a different one.
 */
export const getTimezoneOptions = (current?: string): string[] => {
  let zones = FALLBACK_TIMEZONES;
  try {
    const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf;
    const all = typeof supportedValuesOf === "function" ? supportedValuesOf("timeZone") : [];
    if (all.length > 0) {
      zones = [...new Set([DEFAULT_TIMEZONE, "UTC", ...all])];
    }
  } catch {
    // An engine that throws here just gets the fallback list.
  }
  return current && !zones.includes(current) ? [current, ...zones] : zones;
};

export const cloneSettings = (settings: HelplineSettings): HelplineSettings =>
  JSON.parse(JSON.stringify(settings)) as HelplineSettings;

const trimmedOrNull = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

/** Keeps only offered languages, trims, and treats blank as absent. */
const pruneByLanguage = (
  record: Record<string, string> | undefined,
  languages: string[],
): Record<string, string> => {
  const pruned: Record<string, string> = {};
  for (const code of languages) {
    const text = (record?.[code] ?? "").trim();
    if (text !== "") pruned[code] = text;
  }
  return pruned;
};

const dayRank = (day: HelplineWeekday) => WEEKDAYS_MONDAY_FIRST.indexOf(day);

/**
 * The canonical form of a settings object: fixed key order, trimmed text, blank optional text as
 * `null`, per-language text only for offered languages, opening windows sorted Monday first.
 *
 * It is what gets sent on Save and what dirty-checking compares, so two values that mean the same
 * thing never look "changed" just because of key order, a trailing space or an empty string.
 */
export const normaliseSettings = (settings: HelplineSettings): HelplineSettings => {
  const languages = sortLanguages(settings.languages);
  return {
    retentionDays: settings.retentionDays,
    hours: settings.hours
      ? {
          tz: settings.hours.tz,
          weekly: settings.hours.weekly
            .map(({ day, open, close }) => ({ day, open, close }))
            .sort((a, b) => dayRank(a.day) - dayRank(b.day) || a.open.localeCompare(b.open)),
        }
      : null,
    languages,
    allowQueueWhenNoListeners: settings.allowQueueWhenNoListeners,
    maxWaitMinutes: settings.maxWaitMinutes,
    idleEndMinutes: settings.idleEndMinutes,
    maxWaitingTalkers: settings.maxWaitingTalkers,
    orgMaxConcurrentPerListener: settings.orgMaxConcurrentPerListener,
    emergencyResources: pruneByLanguage(settings.emergencyResources, languages),
    closingMessage: pruneByLanguage(settings.closingMessage, languages),
    escalationChecklist: settings.escalationChecklist.map(step => step.trim()),
    supervisorAlertChannels: {
      inApp: settings.supervisorAlertChannels.inApp,
      push: settings.supervisorAlertChannels.push,
      slackWebhookUrl: trimmedOrNull(settings.supervisorAlertChannels.slackWebhookUrl),
    },
    listenerSupportContact: trimmedOrNull(settings.listenerSupportContact),
    ageNotice: trimmedOrNull(settings.ageNotice),
    copilot: {
      suggestions: settings.copilot.suggestions,
      nudges: settings.copilot.nudges,
      riskClassifier: settings.copilot.riskClassifier,
      rollingSummaryEveryTurns: settings.copilot.rollingSummaryEveryTurns,
    },
    riskHighConfidence: settings.riskHighConfidence,
    summaryFields: settings.summaryFields.map(({ key, label, description }) => ({
      key: key.trim(),
      label: label.trim(),
      description: (description ?? "").trim(),
    })),
  };
};

/** Deep comparison of the canonical forms (JSON, as the task spec asks). */
export const isSettingsDirty = (form: HelplineSettings, server: HelplineSettings): boolean =>
  JSON.stringify(normaliseSettings(form)) !== JSON.stringify(normaliseSettings(server));

/** Error text keyed by field path (`maxWaitMinutes`, `emergencyResources.en`, `summaryFields.0.key`…). */
export type ValidationErrors = Record<string, string>;

export const SLACK_WEBHOOK_PREFIX = "https://hooks.slack.com/";
export const SUMMARY_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Inclusive whole-number limits for the numeric limits, used by both the inputs and validation. */
export const NUMBER_LIMITS = {
  maxWaitMinutes: { min: 1, max: 240 },
  idleEndMinutes: { min: 1, max: 120 },
  maxWaitingTalkers: { min: 1, max: 500 },
  orgMaxConcurrentPerListener: { min: 1, max: 10 },
  rollingSummaryEveryTurns: { min: 1, max: 20 },
} as const;

export const RISK_CONFIDENCE_LIMITS = { min: 0.5, max: 0.95, step: 0.05 } as const;

const isWholeNumberBetween = (value: unknown, min: number, max: number): boolean =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

/**
 * Everything wrong with the form, or `{}`. Nothing here trims or fixes anything — it reports, so an
 * admin sees what they typed next to what is wrong with it.
 */
export const validateSettings = (form: HelplineSettings): ValidationErrors => {
  const errors: ValidationErrors = {};
  const { errors: text } = en.textHelpline;

  (Object.keys(NUMBER_LIMITS) as (keyof typeof NUMBER_LIMITS)[]).forEach(field => {
    const { min, max } = NUMBER_LIMITS[field];
    const value = field === "rollingSummaryEveryTurns" ? form.copilot[field] : form[field];
    if (!isWholeNumberBetween(value, min, max)) {
      errors[field] = text.wholeNumberBetween(min, max);
    }
  });

  if (
    typeof form.retentionDays !== "number" ||
    !Number.isInteger(form.retentionDays) ||
    form.retentionDays < 0
  ) {
    errors.retentionDays = text.wholeNumberAtLeast(0);
  }

  if (
    typeof form.riskHighConfidence !== "number" ||
    !Number.isFinite(form.riskHighConfidence) ||
    form.riskHighConfidence < RISK_CONFIDENCE_LIMITS.min ||
    form.riskHighConfidence > RISK_CONFIDENCE_LIMITS.max
  ) {
    errors.riskHighConfidence = text.numberBetween(
      RISK_CONFIDENCE_LIMITS.min.toFixed(2),
      RISK_CONFIDENCE_LIMITS.max.toFixed(2),
    );
  }

  if (form.languages.length === 0) {
    errors.languages = text.languagesRequired;
  }
  for (const code of form.languages) {
    if ((form.emergencyResources[code] ?? "").trim() === "") {
      errors[`emergencyResources.${code}`] = text.emergencyResourcesRequired(languageName(code));
    }
  }

  if (form.hours) {
    if (form.hours.tz.trim() === "") {
      errors["hours.tz"] = text.timezoneRequired;
    }
    if (form.hours.weekly.length === 0) {
      errors.hours = text.hoursNeedOneDay;
    }
    form.hours.weekly.forEach(({ day, open, close }) => {
      const key = `hours.day.${day}`;
      if (errors[key]) return;
      if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close)) {
        errors[key] = text.timesRequired(dayName(day));
      } else if (close <= open) {
        errors[key] = text.closeAfterOpen(dayName(day));
      }
    });
  }

  form.escalationChecklist.forEach((step, index) => {
    if (step.trim() === "") {
      errors[`escalationChecklist.${index}`] = text.checklistStepEmpty(index + 1);
    }
  });

  const slack = (form.supervisorAlertChannels.slackWebhookUrl ?? "").trim();
  if (slack !== "" && !slack.startsWith(SLACK_WEBHOOK_PREFIX)) {
    errors.slackWebhookUrl = text.slackWebhookUrl;
  }

  const seenKeys = new Map<string, number>();
  form.summaryFields.forEach((field, index) => {
    const key = field.key.trim();
    if (key === "") {
      errors[`summaryFields.${index}.key`] = text.summaryKeyRequired;
    } else if (!SUMMARY_KEY_PATTERN.test(key)) {
      errors[`summaryFields.${index}.key`] = text.summaryKeyFormat;
    } else if (seenKeys.has(key)) {
      errors[`summaryFields.${index}.key`] = text.summaryKeyDuplicate;
      // Mark the first occurrence too, so both rows of a clash show the problem.
      errors[`summaryFields.${seenKeys.get(key)}.key`] = text.summaryKeyDuplicate;
    } else {
      seenKeys.set(key, index);
    }
    if (field.label.trim() === "") {
      errors[`summaryFields.${index}.label`] = text.summaryLabelRequired;
    }
  });

  return errors;
};

/**
 * The server's `message` for a failed request. NestJS validation failures arrive as an array of
 * messages; join them rather than showing "[object Object]" or hiding the specifics.
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { data?: { message?: unknown } } | null | undefined)?.data?.message;
  if (typeof message === "string" && message.trim() !== "") return message;
  if (Array.isArray(message) && message.length > 0) return message.join(" ");
  return fallback;
};
