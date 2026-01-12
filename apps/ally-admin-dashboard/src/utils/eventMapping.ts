import { SessionEvent, UpdateScenarioEventDataParam } from "@types";

import { isNonEmptyString } from "./common";

// Constants for event fields
export const MAPPED_EVENT_FIELDS = {
  ID: "id",
  NAME: "name",
  SCORE: "score",
  EMOJI: "emoji",
  MESSAGE: "message",
  FEEDBACK_STATUS: "feedbackStatus",
  BRANCHING_STATUS: "branchingStatus",
  BRANCH_INSTRUCTION: "branchInstruction",
  // Detection config fields
  MAX_OCCURRENCES: "maxOccurrences",
  MIN_GAP_TIME: "minGapTime",
  START_TIME: "startTime",
  END_TIME: "endTime",
  MIN_SCORE: "minScore",
  MAX_SCORE: "maxScore",
} as const;

// Default values for new events
export const DEFAULT_EVENT_VALUES = {
  EMOJI: "🫥",
  SCORE: 0,
  MESSAGE: "",
  BRANCH_INSTRUCTION: "",
  FEEDBACK_STATUS: false,
  BRANCHING_STATUS: false,
  // Detection config defaults
  MAX_OCCURRENCES: null,
  MIN_GAP_TIME: null,
  START_TIME: null,
  END_TIME: null,
  MIN_SCORE: null,
  MAX_SCORE: null,
} as const;

// Helper to create a cell structure
export const createCell = <T>(value: T, disabled: boolean, rowId: string) => ({
  value,
  disabled,
  rowId,
});

// Create a new empty event
export const createNewEvent = (): UpdateScenarioEventDataParam => {
  const eventId = "";
  return {
    id: createCell(eventId, false, eventId),
    name: createCell("", false, eventId),
    score: createCell(DEFAULT_EVENT_VALUES.SCORE, true, eventId),
    emoji: createCell(DEFAULT_EVENT_VALUES.EMOJI, true, eventId),
    message: createCell(DEFAULT_EVENT_VALUES.MESSAGE, true, eventId),
    feedbackStatus: createCell(DEFAULT_EVENT_VALUES.FEEDBACK_STATUS, false, eventId),
    branchingStatus: createCell(DEFAULT_EVENT_VALUES.BRANCHING_STATUS, false, eventId),
    branchInstruction: createCell(DEFAULT_EVENT_VALUES.BRANCH_INSTRUCTION, true, eventId),
    // Detection config fields
    maxOccurrences: createCell(DEFAULT_EVENT_VALUES.MAX_OCCURRENCES, true, eventId),
    minGapTime: createCell(DEFAULT_EVENT_VALUES.MIN_GAP_TIME, true, eventId),
    startTime: createCell(DEFAULT_EVENT_VALUES.START_TIME, true, eventId),
    endTime: createCell(DEFAULT_EVENT_VALUES.END_TIME, true, eventId),
    minScore: createCell(DEFAULT_EVENT_VALUES.MIN_SCORE, true, eventId),
    maxScore: createCell(DEFAULT_EVENT_VALUES.MAX_SCORE, true, eventId),
  };
};

// Determine if a field should be disabled based on status flags
export const getDisabledState = (
  field: string,
  feedbackStatus: boolean,
  branchingStatus: boolean,
): boolean => {
  const feedbackFields: string[] = [
    MAPPED_EVENT_FIELDS.SCORE,
    MAPPED_EVENT_FIELDS.EMOJI,
    MAPPED_EVENT_FIELDS.MESSAGE,
  ];

  if (feedbackFields.includes(field)) {
    return !feedbackStatus;
  }
  if (field === MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION) {
    return !branchingStatus;
  }
  return false;
};

/**
 * Convert time string (HH:MM:SS) to seconds
 * @param timeString - Time in format "HH:MM:SS" or "00:00:00"
 * @returns Number of seconds or null if invalid
 */
const timeStringToSeconds = (timeString: string | number | null | undefined): number | null => {
  if (timeString === null || timeString === undefined || timeString === "") return null;

  if (typeof timeString === "number") {
    return timeString;
  }

  const parts = timeString.split(":");
  if (parts.length !== 3) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Convert seconds to time string (HH:MM:SS)
 * @param seconds - Number of seconds
 * @returns Time string in format "HH:MM:SS" or null if invalid
 */
const secondsToTimeString = (seconds: number | string | null | undefined): string | null => {
  if (seconds == null) return null;

  const totalSeconds = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  if (isNaN(totalSeconds)) return null;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

// Format a SessionEvent to UpdateScenarioEventDataParam
export const formatToMappedEvent = (event: SessionEvent): UpdateScenarioEventDataParam => {
  const feedbackStatus = true;
  const branchingStatus = true;

  return {
    id: createCell(event.id, false, event.id),
    name: createCell(event.name || event.id, false, event.id),
    score: createCell(event.score ?? DEFAULT_EVENT_VALUES.SCORE, false, event.id),
    emoji: createCell(
      event.emoji || DEFAULT_EVENT_VALUES.EMOJI,
      getDisabledState(MAPPED_EVENT_FIELDS.EMOJI, feedbackStatus, branchingStatus),
      event.id,
    ),
    message: createCell(
      event.message || DEFAULT_EVENT_VALUES.MESSAGE,
      getDisabledState(MAPPED_EVENT_FIELDS.MESSAGE, feedbackStatus, branchingStatus),
      event.id,
    ),
    feedbackStatus: createCell(feedbackStatus, false, event.id),
    branchingStatus: createCell(branchingStatus, false, event.id),
    branchInstruction: createCell(
      event.branchInstruction || DEFAULT_EVENT_VALUES.BRANCH_INSTRUCTION,
      getDisabledState(MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION, feedbackStatus, branchingStatus),
      event.id,
    ),
    // Detection config fields
    maxOccurrences: createCell(
      event.detectionConfig?.maxOccurrences ?? DEFAULT_EVENT_VALUES.MAX_OCCURRENCES,
      false,
      event.id,
    ),
    minGapTime: createCell(
      secondsToTimeString(event.detectionConfig?.minGapTime) ?? DEFAULT_EVENT_VALUES.MIN_GAP_TIME,
      false,
      event.id,
    ),
    startTime: createCell(
      secondsToTimeString(event.detectionConfig?.startTime) ?? DEFAULT_EVENT_VALUES.START_TIME,
      false,
      event.id,
    ),
    endTime: createCell(
      secondsToTimeString(event.detectionConfig?.endTime) ?? DEFAULT_EVENT_VALUES.END_TIME,
      false,
      event.id,
    ),
    minScore: createCell(
      event.detectionConfig?.minScore ?? DEFAULT_EVENT_VALUES.MIN_SCORE,
      false,
      event.id,
    ),
    maxScore: createCell(
      event.detectionConfig?.maxScore ?? DEFAULT_EVENT_VALUES.MAX_SCORE,
      false,
      event.id,
    ),
  };
};

// Convert UpdateScenarioEventDataParam array to API format
export const convertToApiFormat = (events: UpdateScenarioEventDataParam[]) => {
  return events
    .map(event => ({
      id: event.id?.value,
      name: event.name?.value,
      score: event.score?.value,
      emoji: event.emoji?.value,
      message: event.message?.value,
      feedbackStatus: event.feedbackStatus?.value,
      branchingStatus: event.branchingStatus?.value,
      branchInstruction: event.branchInstruction?.value,
      detectionConfig: {
        maxOccurrences: event.maxOccurrences?.value,
        minGapTime: timeStringToSeconds(event.minGapTime?.value),
        startTime: timeStringToSeconds(event.startTime?.value),
        endTime: timeStringToSeconds(event.endTime?.value),
        minScore: event.minScore?.value,
        maxScore: event.maxScore?.value,
      },
    }))
    ?.filter(event => isNonEmptyString(event?.id));
};

// Format API response to UpdateScenarioEventDataParam
export const formatApiResponseToMappedEvent = (event: {
  id?: string;
  eventId?: string;
  name?: string;
  score?: number;
  emoji?: string;
  message?: string;
  feedbackStatus: boolean;
  branchingStatus: boolean;
  branchInstruction?: string;
  detectionConfig?: {
    maxOccurrences?: number;
    minGapTime?: string | number;
    startTime?: string | number;
    endTime?: string | number;
    minScore?: number;
    maxScore?: number;
  };
}): UpdateScenarioEventDataParam => {
  // Support both 'id' and 'eventId' for backward compatibility
  const eventId = event.id || event.eventId || "";

  return {
    id: createCell(eventId, false, eventId),
    name: createCell(event.name || eventId, false, eventId),
    score: createCell(event.score ?? DEFAULT_EVENT_VALUES.SCORE, false, eventId),
    emoji: createCell(
      event.emoji || DEFAULT_EVENT_VALUES.EMOJI,
      getDisabledState(MAPPED_EVENT_FIELDS.EMOJI, event.feedbackStatus, event.branchingStatus),
      eventId,
    ),
    message: createCell(
      event.message || DEFAULT_EVENT_VALUES.MESSAGE,
      getDisabledState(MAPPED_EVENT_FIELDS.MESSAGE, event.feedbackStatus, event.branchingStatus),
      eventId,
    ),
    feedbackStatus: createCell(event.feedbackStatus, false, eventId),
    branchingStatus: createCell(event.branchingStatus, false, eventId),
    branchInstruction: createCell(
      event.branchInstruction || DEFAULT_EVENT_VALUES.BRANCH_INSTRUCTION,
      getDisabledState(
        MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION,
        event.feedbackStatus,
        event.branchingStatus,
      ),
      eventId,
    ),
    // Detection config fields - convert seconds to time strings for time fields
    maxOccurrences: createCell(
      event.detectionConfig?.maxOccurrences ?? DEFAULT_EVENT_VALUES.MAX_OCCURRENCES,
      false,
      eventId,
    ),
    minGapTime: createCell(
      secondsToTimeString(event.detectionConfig?.minGapTime) ?? DEFAULT_EVENT_VALUES.MIN_GAP_TIME,
      false,
      eventId,
    ),
    startTime: createCell(
      secondsToTimeString(event.detectionConfig?.startTime) ?? DEFAULT_EVENT_VALUES.START_TIME,
      false,
      eventId,
    ),
    endTime: createCell(
      secondsToTimeString(event.detectionConfig?.endTime) ?? DEFAULT_EVENT_VALUES.END_TIME,
      false,
      eventId,
    ),
    minScore: createCell(
      event.detectionConfig?.minScore ?? DEFAULT_EVENT_VALUES.MIN_SCORE,
      false,
      eventId,
    ),
    maxScore: createCell(
      event.detectionConfig?.maxScore ?? DEFAULT_EVENT_VALUES.MAX_SCORE,
      false,
      eventId,
    ),
  };
};

// Create a Map for quick event lookup
export const createSessionEventsMap = (events: SessionEvent[]): Map<string, SessionEvent> => {
  return new Map(events.map(event => [event.id, event]));
};

export const addScoreColors = (data: UpdateScenarioEventDataParam[]) => {
  // Extract score values
  const values = data.map(d => d.score.value);

  const min = Math.min(...values);
  const max = Math.max(...values);

  // Color anchors
  const RED = { r: 220, g: 80, b: 80 };
  const YELLOW = { r: 255, g: 255, b: 179 };
  const GREEN = { r: 80, g: 180, b: 120 };

  const lerp = (a, b, t) => Math.round(a + (b - a) * t);

  const mix = (c1, c2, t) =>
    `rgb(${lerp(c1.r, c2.r, t)}, ${lerp(c1.g, c2.g, t)}, ${lerp(c1.b, c2.b, t)})`;

  const getColor = value => {
    if (value === 0) return mix(RED, YELLOW, 1);
    if (value <= 0) {
      // Red → Yellow
      const t = (value - min) / (0 - min || 1);
      return mix(RED, YELLOW, Math.max(0, Math.min(1, t)));
    }
    // Yellow → Green
    const t = value / (max || 1);
    return mix(YELLOW, GREEN, Math.max(0, Math.min(1, t)));
  };

  return data.map(item => ({
    ...item,
    score: {
      ...item.score,
      color: getColor(item.score.value),
    },
  }));
};
