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
} as const;

// Default values for new events
export const DEFAULT_EVENT_VALUES = {
  EMOJI: "🫥",
  SCORE: 0,
  MESSAGE: "",
  BRANCH_INSTRUCTION: "",
  FEEDBACK_STATUS: false,
  BRANCHING_STATUS: false,
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
    }))
    ?.filter(event => isNonEmptyString(event?.id));
};

// Format API response to UpdateScenarioEventDataParam
export const formatApiResponseToMappedEvent = (event: {
  eventId: string;
  name: string;
  score: number;
  emoji: string;
  message: string;
  feedbackStatus: boolean;
  branchingStatus: boolean;
  branchInstruction: string;
}): UpdateScenarioEventDataParam => {
  return {
    id: createCell(event.eventId, false, event.eventId),
    name: createCell(event.name, false, event.eventId),
    score: createCell(event.score, false, event.eventId),
    emoji: createCell(
      event.emoji,
      getDisabledState(MAPPED_EVENT_FIELDS.EMOJI, event.feedbackStatus, event.branchingStatus),
      event.eventId,
    ),
    message: createCell(
      event.message,
      getDisabledState(MAPPED_EVENT_FIELDS.MESSAGE, event.feedbackStatus, event.branchingStatus),
      event.eventId,
    ),
    feedbackStatus: createCell(event.feedbackStatus, false, event.eventId),
    branchingStatus: createCell(event.branchingStatus, false, event.eventId),
    branchInstruction: createCell(
      event.branchInstruction,
      getDisabledState(
        MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION,
        event.feedbackStatus,
        event.branchingStatus,
      ),
      event.eventId,
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
  const WHITE = { r: 245, g: 245, b: 245 };
  const GREEN = { r: 80, g: 180, b: 120 };

  const lerp = (a, b, t) => Math.round(a + (b - a) * t);

  const mix = (c1, c2, t) =>
    `rgb(${lerp(c1.r, c2.r, t)}, ${lerp(c1.g, c2.g, t)}, ${lerp(c1.b, c2.b, t)})`;

  const getColor = value => {
    if (value <= 0) {
      // Red → White
      const t = (value - min) / (0 - min || 1);
      return mix(RED, WHITE, Math.max(0, Math.min(1, t)));
    }
    // White → Green
    const t = value / (max || 1);
    return mix(WHITE, GREEN, Math.max(0, Math.min(1, t)));
  };

  return data.map(item => ({
    ...item,
    score: {
      ...item.score,
      color: getColor(item.score.value),
    },
  }));
};
