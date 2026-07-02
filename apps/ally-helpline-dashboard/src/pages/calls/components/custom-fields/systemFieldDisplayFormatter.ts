import { TFunction } from "i18next";

import { getFormattedDateTime } from "@utils";

/**
 * SYSTEM-fillMode fields (Call ID, Call Duration, etc.) arrive as raw values
 * from the backend — locale-sensitive display formatting (minutes,
 * dates, percentages) happens here instead, matching exactly what the old
 * hardcoded summary fields displayed. Only these 4 seedKeys need an
 * override; every other field (including the other 4 SYSTEM ones) renders
 * through the fully generic path.
 */
const LOCALE_FORMATTED_SEED_KEYS = new Set([
  "callDuration",
  "callDate",
  "callTime",
  "listeningShare",
]);

export const isLocaleFormattedSeedKey = (seedKey: string | null | undefined): boolean =>
  !!seedKey && LOCALE_FORMATTED_SEED_KEYS.has(seedKey);

export const formatSystemFieldDisplayValue = (
  seedKey: string,
  rawValue: string,
  t: TFunction,
): string => {
  switch (seedKey) {
    case "callDuration": {
      const totalSeconds = Number(rawValue);
      if (!Number.isFinite(totalSeconds)) return rawValue;
      const minutes = Math.floor(totalSeconds / 60);
      return t("common.minutes_other", { count: minutes });
    }
    case "callDate":
      return getFormattedDateTime(rawValue, "do MMMM yyyy");
    case "callTime": {
      const [start, end] = rawValue.split("|");
      return `${getFormattedDateTime(start, "HH:mm")} - ${getFormattedDateTime(end, "HH:mm")}`;
    }
    case "listeningShare": {
      const ratio = Number(rawValue);
      if (!Number.isFinite(ratio)) return rawValue;
      // Matches the previous hardcoded field exactly (no rounding).
      return `${ratio * 100}%`;
    }
    default:
      return rawValue;
  }
};
