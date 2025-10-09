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
