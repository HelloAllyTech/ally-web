import { matchPath } from "react-router-dom";

import { EMAIL_REGEX } from "@constants";

export const validateEmail = (email: string): boolean => {
  return email && EMAIL_REGEX.test(email);
};

export const getKeyFromIndex = (index: number, prefix: string = "key") => `${prefix}-${index}`;

export const updateQueryParamListWithoutReload = (
  searchParamList: { key: string; value: string }[],
) => {
  const searchParams = new URLSearchParams(window.location.search);

  searchParamList.forEach(({ key, value }) => {
    searchParams.set(key, value);
  });

  // Update URL without page reload
  const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
  window.history.pushState({}, "", newUrl);
};

export const openLinkInNewTab = (url: string, target: string = "_blank") => {
  window.open(url, target, "noopener,noreferrer");
};

export const isPathExcluded = (currentPath: string, excludedPaths: string[]) => {
  return excludedPaths.some(path => matchPath(path, currentPath));
};

const tryParseJson = (str: string): unknown => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const uint8ToString = (bytes: Uint8Array): string => {
  let result = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return result;
};

export const decodeUint8ToJson = (payload: unknown): unknown => {
  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as { length?: number }).length === "number"
  ) {
    const raw = uint8ToString(payload as Uint8Array);
    const parsed = tryParseJson(raw);
    if (parsed) return parsed;
    return null;
  }
  return null;
};

export const formatSizeInBytes = (sizeInBytes: number, targetUnit: "KB" | "MB" | "GB") => {
  if (targetUnit === "KB") {
    return sizeInBytes / 1024;
  }
  if (targetUnit === "MB") {
    return sizeInBytes / 1024 / 1024;
  }
  return sizeInBytes / 1024 / 1024 / 1024;
};

export const formatSizeByByteSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} bytes`;
  }
  if (sizeInBytes < 1024 * 1024) {
    return `${sizeInBytes / 1024} KB`;
  }
  if (sizeInBytes < 1024 * 1024 * 1024) return `${sizeInBytes / (1024 * 1024)} MB`;
  return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const isNonEmptyObject = (value: any): boolean => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
};

const SECONDS_IN = {
  year: 31536000,
  month: 2592000,
  w: 604800,
  D: 86400,
  hour: 3600,
  min: 60,
  sec: 1,
} as const;

const TIME_THRESHOLDS: [keyof typeof SECONDS_IN, number][] = [
  ["month", SECONDS_IN.month],
  ["w", SECONDS_IN.w],
  ["D", SECONDS_IN.D],
  ["hour", SECONDS_IN.hour],
  ["min", SECONDS_IN.min],
  ["sec", SECONDS_IN.sec],
];

const pluralize = (value: number, unit: string) => `${value} ${unit}${value === 1 ? "" : "s"}`;

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" at ", " ");
};

export const formatRelativeTime = (dateString: string): string => {
  const diffSeconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);

  if (diffSeconds < 1) return "Just now";

  const years = Math.floor(diffSeconds / SECONDS_IN.year);

  if (years >= 2) return pluralize(years, "year");

  if (years === 1) {
    const months = Math.floor((diffSeconds % SECONDS_IN.year) / SECONDS_IN.month);
    return months === 0 ? "1 year" : `1 year ${pluralize(months, "month")}`;
  }

  for (const [unit, seconds] of TIME_THRESHOLDS) {
    const value = Math.floor(diffSeconds / seconds);
    if (value >= 1 && unit !== "D") return pluralize(value, unit);
    if (value >= 1 && unit === "D") return `${value} D`;
  }

  return "Just now";
};
