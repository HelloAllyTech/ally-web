import { matchPath } from "react-router-dom";

import { ButtonProps, ButtonVariant } from "@components/types";
import { EMAIL_REGEX, FORM_FIELD_TYPES } from "@constants";
import {
  AccessFilterValue,
  AssignmentStatus,
  CreatorFieldGroups,
  Simulation,
  SimulationStatus,
  UserRoles,
} from "@types";

export const validateEmail = (email: string): boolean => {
  return Boolean(email && EMAIL_REGEX.test(email));
};

/**
 * Split a free-text blob of email addresses (separated by newlines, commas, or
 * semicolons) into a trimmed, de-duplicated list. Duplicates are compared
 * case-insensitively but the first-seen casing is preserved; blanks are dropped.
 * Used by the bulk-add-users flow.
 */
export const parseEmailList = (raw: string): string[] => {
  const seen = new Set<string>();
  return (raw || "")
    .split(/[\n,;]+/)
    .map(email => email.trim())
    .filter(email => {
      if (!email) return false;
      const key = email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

/**
 * Converts time from HH:MM:SS format to seconds
 * @param timeString - Time in HH:MM:SS format (e.g., "00:20:00")
 * @returns Time in seconds (e.g., 1200)
 */
export const convertTimeToSeconds = (timeString: string): number => {
  if (!isNonEmptyString(timeString)) return 0;

  const parts = timeString.split(":");
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;

  return hours * 3600 + minutes * 60 + seconds;
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatCapitalizedEnum = (str: string | UserRoles) => {
  const value = typeof str === "string" ? str : str?.name;
  if (!value) return "";
  let capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  capitalized = capitalized.replace(/_|-/g, " ");
  return capitalized;
};

// Maps button variants to IBM Carbon button "kinds": Primary (Blue 60),
// Secondary (Gray 80 fill), Danger (Red 60), and Ghost (transparent).
export const getButtonStyles = (variant: ButtonProps["variant"]) => {
  switch (variant) {
    case ButtonVariant.DESTRUCTIVE:
      return "bg-destructive text-white hover:bg-destructive-600 active:bg-destructive-700 disabled:bg-neutral-300 disabled:text-neutral-500";
    case ButtonVariant.SECONDARY:
      return "bg-secondary-700 text-white hover:bg-secondary-800 active:bg-secondary-900 disabled:bg-neutral-300 disabled:text-neutral-500";
    case ButtonVariant.ICON:
      return "bg-transparent border-none text-typography-900 hover:bg-secondary-50 disabled:bg-transparent !p-2 !h-fit";
    case ButtonVariant.TEXT:
      return "bg-transparent border-none text-primary-500 hover:bg-secondary-50 disabled:bg-transparent";
    case ButtonVariant.PRIMARY:
    default:
      return "text-white bg-primary-500 hover:bg-primary-600 active:bg-primary-700 disabled:bg-neutral-300 disabled:text-neutral-500";
  }
};

export const getStatusColor = (status: Simulation["status"]) => {
  switch (status) {
    case SimulationStatus.ACTIVE:
      return "bg-success-100 text-success-900";
    case SimulationStatus.DRAFT:
      return "bg-neutral-200 text-typography-800";
    case SimulationStatus.ARCHIVED:
      return "bg-warning-100 text-typography-800";
    default:
      return "bg-neutral-100 text-typography-800";
  }
};

export const formatSimulationUsage = (usage: number) => {
  if (usage === 1) return `${usage} time`;
  return `${usage || 0} times`;
};

export const getChipValue = (items: string[]): string => {
  if (!items || items.length === 0) return "";
  return items.length > 1 ? `${items[0]} +${items.length - 1}` : items[0];
};

// Map voices API response to dropdown options
export const getSimulationVoiceOptions = (
  voices: Array<{ id?: string; name?: string }> = [],
): Array<{ value: string; label: string }> => {
  return voices
    .map(v => ({
      value: v?.id ?? v?.name ?? "",
      label: formatCapitalizedEnum(v?.name ?? v?.id ?? ""),
    }))
    .filter(o => Boolean(o.value) && Boolean(o.label));
};

// Type checking utility functions
export const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
};

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value?.trim() !== "";
};

export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

export const toAssignmentStatus = (filter: AccessFilterValue): AssignmentStatus | undefined => {
  if (filter === AccessFilterValue.ENABLED) return AssignmentStatus.ASSIGNED;
  if (filter === AccessFilterValue.DISABLED) return AssignmentStatus.UNASSIGNED;
  return undefined;
};

export const isNonEmptyArray = <T>(value: unknown): value is T[] => {
  return Array.isArray(value) && value?.length > 0;
};

export const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null || value === "") return true;

  return false;
};

export const normalizeScore = (value: string | number): number => {
  const newValue = Number(value);
  if (newValue < 0) return 0;

  return Math.round(newValue);
};

export const isNonEmptyObject = (value: any): boolean => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
};

export const extractValidData = (
  fields: CreatorFieldGroups[],
  formData: Record<string, any>,
): Record<string, any> => {
  const allFields = fields.flatMap(group => group.fields);
  return Object.fromEntries(
    Object.entries(formData).map(([key, value]) => {
      const field = allFields.find(field => field.id === key);
      if (Array.isArray(value) && value.length === 0) {
        return [
          key,
          field?.type !== FORM_FIELD_TYPES.IMAGE_UPLOAD &&
          field?.type !== FORM_FIELD_TYPES.VIDEO_UPLOAD
            ? []
            : null,
        ];
      }
      switch (field?.type) {
        case FORM_FIELD_TYPES.SELECT:
          return [key, isNonEmptyString(value) ? value : null];

        case FORM_FIELD_TYPES.NUMBER: //convert string to number and empty val to null
          return [key, value ? parseInt(value) : null];

        case FORM_FIELD_TYPES.SLIDER: //float-valued slider (e.g. temperature); empty → null
          return [key, value === "" || value == null ? null : parseFloat(value)];

        case FORM_FIELD_TYPES.IMAGE_UPLOAD: //image upload if empty returns object,so convert to null
          return [key, value?.length > 0 ? value : null];

        case FORM_FIELD_TYPES.VIDEO_UPLOAD: //video upload if empty returns object,so convert to null
          return [key, value?.length > 0 ? value : null];

        case FORM_FIELD_TYPES.TOGGLE_BUTTON:
          return [key, Boolean(value)];

        case FORM_FIELD_TYPES.CUSTOM.RADIO_BUTTONS:
          return [key, isNonEmptyString(value) ? value : null];

        case FORM_FIELD_TYPES.KNOWLEDGE_SOURCE:
          return [key, Array.isArray(value) ? value : []];

        default:
          return [
            key,
            typeof value === "boolean"
              ? value
              : isNumber(value) || isNonEmptyArray(value) || isNonEmptyObject(value)
                ? value
                : isNonEmptyString(value)
                  ? value.trim()
                  : null,
          ];
      }
    }),
  );
};

/**
 * Converts seconds to HH:MM:SS format for display
 * @param seconds - Time in seconds (number)
 * @returns Time in HH:MM:SS format (string), defaults to "00:00:00" if invalid
 */
export const convertSecondsToTimeString = (seconds: number | undefined): string => {
  if (!seconds || !isNumber(seconds) || seconds < 0) return "00:00:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

/**
 * Validates and formats time string to HH:MM:SS format
 * @param timeString - Time string in HH:MM:SS format (e.g., "00:20:00")
 * @returns Validated and formatted time string (e.g., "00:20:00")
 */
export const validateTime = (timeString: string): string => {
  if (!timeString) {
    return timeString;
  }

  // Extract digits and pad to 6 digits with trailing zeros
  const digits = timeString.replace(/\D/g, "").padEnd(6, "0").slice(0, 6);
  const paddedTime = `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;

  const parts = paddedTime.split(":");
  if (parts.length !== 3) {
    return timeString;
  }

  let hours = parseInt(parts[0], 10);
  let minutes = parseInt(parts[1], 10);
  let seconds = parseInt(parts[2], 10);

  // Clamp values to valid ranges
  if (!isNaN(hours)) {
    hours = Math.max(0, Math.min(23, hours));
  }
  if (!isNaN(minutes)) {
    minutes = Math.max(0, Math.min(59, minutes));
  }
  if (!isNaN(seconds)) {
    seconds = Math.max(0, Math.min(59, seconds));
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Validates if a time string is within the specified min/max range
 * @param timeStr - Time string in HH:MM:SS format
 * @param minTime - Optional minimum allowed time in HH:MM:SS format
 * @param maxTime - Optional maximum allowed time in HH:MM:SS format
 * @returns Object with isValid boolean and optional error message
 */
export const validateTimeRange = (
  timeStr: string,
  minTime?: string,
  maxTime?: string,
): { isValid: boolean; error?: string } => {
  if (!timeStr) return { isValid: true };

  // Convert HH:MM:SS to seconds for comparison
  const timeToSeconds = (time: string): number => {
    const [h, m, s] = time.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };

  const seconds = timeToSeconds(timeStr);

  if (minTime && seconds < timeToSeconds(minTime)) {
    return { isValid: false, error: `Minimum time is ${minTime}` };
  }

  if (maxTime && seconds > timeToSeconds(maxTime)) {
    return { isValid: false, error: `Maximum time is ${maxTime}` };
  }

  return { isValid: true };
};

/**
 * Converts a camelCase string to snake_case
 * @param str - camelCase string (e.g., "voiceId")
 * @returns snake_case string (e.g., "voice_id")
 */
export const camelToSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

/**
 * Converts an object's keys from camelCase to snake_case
 * Only includes properties that have defined values (not undefined)
 * @param obj - Object with camelCase keys
 * @returns New object with snake_case keys
 */
export const convertKeysToSnakeCase = <T extends Record<string, unknown>>(
  obj: T | undefined,
): Record<string, unknown> => {
  if (!obj) return {};

  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (value !== undefined) {
        acc[camelToSnakeCase(key)] = value;
      }
      return acc;
    },
    {} as Record<string, unknown>,
  );
};

export const toLocationSlug = (text: string): string =>
  text.trim().toLowerCase().replace(/\s+/g, "_");

export const fromLocationSlug = (slug: string): string =>
  slug
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
