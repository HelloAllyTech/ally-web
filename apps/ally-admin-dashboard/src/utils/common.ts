import { matchPath } from "react-router-dom";

import { ButtonProps, ButtonVariant } from "@components/types";
import { EMAIL_REGEX, FORM_FIELD_TYPES } from "@constants";
import { CreatorFieldGroups, Simulation, SimulationStatus, UserRoles } from "@types";

export const validateEmail = (email: string): boolean => {
  return Boolean(email && EMAIL_REGEX.test(email));
};

/**
 * Validates if a time string is in the format HH:MM:SS and within the specified range
 * @param timeStr - Time string in HH:MM:SS format
 * @param maxTimeStr - Maximum allowed time in HH:MM:SS format
 * @returns true if valid, false otherwise
 */
export const validateMaxTimeValue = (timeStr: string, maxTimeStr: string): boolean => {
  if (!timeStr) return false;

  // Check format HH:MM:SS
  const timeRegex = /^(\d{2}):(\d{2}):(\d{2})$/;
  const match = timeStr.match(timeRegex);

  if (!match) return false;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);

  // Validate ranges for individual components
  if (hours < 0 || hours > 23) return false;
  if (minutes < 0 || minutes > 59) return false;
  if (seconds < 0 || seconds > 59) return false;

  // Convert to total seconds
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  // Parse max time string
  const maxMatch = maxTimeStr.match(timeRegex);
  if (!maxMatch) return false;

  const maxHours = parseInt(maxMatch[1], 10);
  const maxMinutes = parseInt(maxMatch[2], 10);
  const maxSeconds = parseInt(maxMatch[3], 10);

  const maxTotalSeconds = maxHours * 3600 + maxMinutes * 60 + maxSeconds;

  // Check range: must be at least 1 second and not exceed maxTotalSeconds
  if (totalSeconds < 1 || totalSeconds > maxTotalSeconds) return false;

  return true;
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

export const getButtonStyles = (variant: ButtonProps["variant"]) => {
  switch (variant) {
    case ButtonVariant.DESTRUCTIVE:
      return "bg-destructive text-white hover:bg-destructive/90 disabled:bg-destructive/50";
    case ButtonVariant.SECONDARY:
      return "border border-secondary hover:bg-accent hover:text-accent-foreground disabled:bg-accent/50 text-typography-900";
    case ButtonVariant.ICON:
      return "bg-transparent border-none hover:bg-transparent disabled:bg-transparent !p-2 !h-fit";
    case ButtonVariant.TEXT:
      return "bg-transparent border-none hover:bg-transparent disabled:bg-transparent";
    case ButtonVariant.PRIMARY:
    default:
      return "text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary/50";
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
        case FORM_FIELD_TYPES.CUSTOM.VOICE_DROPDOWN: //handles dropdown case
          return [key, isNonEmptyString(value) ? value : null];

        case FORM_FIELD_TYPES.NUMBER: //convert string to number and empty val to null
          return [key, value ? parseInt(value) : null];

        case FORM_FIELD_TYPES.IMAGE_UPLOAD: //image upload if empty returns object,so convert to null
          return [key, value?.length > 0 ? value : null];

        case FORM_FIELD_TYPES.VIDEO_UPLOAD: //video upload if empty returns object,so convert to null
          return [key, value?.length > 0 ? value : null];

        case FORM_FIELD_TYPES.TOGGLE_BUTTON:
          return [key, Boolean(value)];

        case FORM_FIELD_TYPES.CUSTOM.RADIO_BUTTONS:
          return [key, isNonEmptyString(value) ? value : null];

        default:
          return [key, isNonEmptyString(value) ? value.trim() : value];
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
