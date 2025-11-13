import { matchPath } from "react-router-dom";

import { ButtonProps, ButtonVariant } from "@components/types";
import { EMAIL_REGEX, FORM_FIELD_TYPES, SIMULATION_CREATOR_FIELD_GROUPS } from "@constants";
import { Simulation, SimulationStatus, UserRoles } from "@types";

export const validateEmail = (email: string): boolean => {
  return Boolean(email && EMAIL_REGEX.test(email));
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

export const getSimulationStatusColor = (status: Simulation["status"]) => {
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

export const extractValidData = (formData: Record<string, any>): Record<string, any> => {
  const allFields = SIMULATION_CREATOR_FIELD_GROUPS.flatMap(group => group.fields);
  return Object.fromEntries(
    Object.entries(formData).map(([key, value]) => {
      const field = allFields.find(field => field.id === key);

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

        default:
          return [key, isNonEmptyString(value) ? value.trim() : value];
      }
    }),
  );
};
