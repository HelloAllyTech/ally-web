import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { EventSidePanel } from "../EventSidePanel";

vi.mock("@assets", () => ({
  ArrowDownFilled: () => <svg data-testid="arrow-down" />,
  DoubleArrowRight: () => <svg data-testid="double-arrow-right" />,
  Trash: () => <svg data-testid="trash-icon" />,
  Close: () => <svg data-testid="close-icon" />,
  InfoIcon: () => <svg data-testid="info-icon" />,
  TooltipIcon: () => <svg data-testid="tooltip-icon" />,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  AutoExpandableTextarea: ({ value, onChange, placeholder, disabled, className }: any) => (
    <textarea
      data-testid="auto-expandable-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  ),
  Tooltip: ({ children, label }: any) => (
    <span data-testid="tooltip" aria-label={label}>
      {children}
    </span>
  ),
  FEATURE_FLAGS_MAP: {},
}));

vi.mock("@components", () => ({
  EmojiPickerComponent: ({ onEmojiClick = () => {}, buttonText = "😀", className = "" }: any) => (
    <button
      type="button"
      data-testid="emoji-picker-mock"
      className={className}
      onClick={() => onEmojiClick("😊")}
    >
      {buttonText}
    </button>
  ),
  NumberInput: ({ value = 0, onChange = () => {} }: any) => (
    <input
      type="number"
      aria-label="number-input"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    />
  ),
  TriggerConditions: ({ eventType, triggerCondition, sentences, onChange }: any) => (
    <div data-testid="trigger-conditions">
      <span>Event Type: {eventType}</span>
      {sentences && <span>Sentences: {sentences.join(", ")}</span>}
      {triggerCondition && <span>Trigger: {JSON.stringify(triggerCondition)}</span>}
    </div>
  ),
  ActionConfirmationPopup: ({
    isOpen,
    onClose,
    title,
    description,
    primaryButton,
    secondaryButton,
  }: any) =>
    isOpen ? (
      <div data-testid="action-confirmation-popup">
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={primaryButton?.onClick} data-testid="confirm-action">
          {primaryButton?.label}
        </button>
        <button onClick={secondaryButton?.onClick} data-testid="cancel-action">
          {secondaryButton?.label}
        </button>
      </div>
    ) : null,
  OccurrenceControlSection: ({ maxOccurrences, minGapTime }: any) => (
    <div data-testid="occurrence-control-section">
      <span>Max Occurrences: {maxOccurrences}</span>
      <span>Min Gap Time: {minGapTime}</span>
    </div>
  ),
  TimeWindowSection: ({ startTime, endTime }: any) => (
    <div data-testid="time-window-section">
      <span>Start Time: {startTime}</span>
      <span>End Time: {endTime}</span>
    </div>
  ),
  ScoreWindowSection: ({ minScore, maxScore }: any) => (
    <div data-testid="score-window-section">
      <span>Min Score: {minScore}</span>
      <span>Max Score: {maxScore}</span>
    </div>
  ),
  EVENT_TYPE_POPUP_OPTIONS: [
    { value: "SENTENCE_SIMILARITY", label: "Sentence Similarity" },
    { value: "TIME_BASED", label: "Time Based" },
    { value: "SCORE_BASED", label: "Score Based" },
    { value: "COMBINATION", label: "Combination Event" },
  ],
  TextareaWithTriggerDropdown: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="textarea-trigger-dropdown"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  SimpleTagSelector: ({ tags, updateTags, label }: any) => (
    <div data-testid="simple-tag-selector">
      {label && <label>{label}</label>}
      <div>
        {Array.isArray(tags) && tags.length > 0 ? (
          tags.map((tag: string, index: number) => (
            <span key={index} data-testid={`tag-${index}`}>
              {tag}
              <button
                onClick={() => updateTags(tags.filter((_: any, i: number) => i !== index))}
                data-testid={`remove-tag-${index}`}
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span data-testid="no-tags">No tags</span>
        )}
        <button
          data-testid="add-tag-button"
          onClick={() => {
            // Simulate adding a tag
            const newTag = "new-tag";
            updateTags([...tags, newTag]);
          }}
        >
          Add +
        </button>
      </div>
    </div>
  ),
}));

vi.mock("@constants", () => ({
  SPEAKER_OPTIONS: [
    { label: "Speaker 1", value: "speaker1" },
    { label: "Speaker 2", value: "speaker2" },
  ],
  en: { simulation: { editEvent: "Edit event", deleteEvent: "Delete event" } },
  SESSION_EVENT_STATUS_OPTIONS: { ACTIVE: "ACTIVE" },
  SORT_BY: { CREATED_AT: "createdAt" },
  SORT_ORDER: { DESC: "desc" },
  EVENT_DETECTION_TYPES: {
    TIME_BASED: "TIME_BASED",
    SCORE_BASED: "SCORE_BASED",
    SENTENCE_SIMILARITY: "SENTENCE_SIMILARITY",
    COMBINATION: "COMBINATION",
  },
}));

vi.mock("@hooks", () => ({
  useDebounce: (fn: any) => fn,
}));

vi.mock("@api", () => ({
  useGetSessionEventsQuery: () => ({
    data: { data: [] },
  }),
}));

vi.mock("@utils", () => ({
  formatCapitalizedEnum: (v: any) => v,
  isNumber: (value: any): value is number => typeof value === "number" && !isNaN(value),
}));

vi.mock("@components/event-type-selection-dialog", () => ({
  EventType: {
    SENTENCE_SIMILARITY: "SENTENCE_SIMILARITY",
    TIME_BASED: "TIME_BASED",
    SCORE_BASED: "SCORE_BASED",
    COMBINATION: "COMBINATION",
  },
  EVENT_TYPE_OPTIONS: [
    { value: "SENTENCE_SIMILARITY", label: "Sentence Similarity", prefix: "SS" },
    { value: "TIME_BASED", label: "Time Based", prefix: "TB" },
    { value: "SCORE_BASED", label: "Score Based", prefix: "SB" },
    { value: "COMBINATION", label: "Combination Event", prefix: "CE" },
  ],
}));

vi.mock("@utils/eventNameGenerator", () => ({
  generateSequentialEventName: (eventType: string, existingNames: string[]) => {
    const prefixMap: Record<string, string> = {
      SENTENCE_SIMILARITY: "SS",
      TIME_BASED: "TB",
      SCORE_BASED: "SB",
      COMBINATION: "CE",
    };
    const prefix = prefixMap[eventType] || "EV";
    return `${prefix}001`;
  },
}));

describe("EventSidePanel", () => {
  const baseEvent = {
    id: "evt-1",
    name: "Test Event",
    detectionType: "keyword",
    speaker: "speaker1",
    description: "Desc",
    branchInstruction: "Instr",
    score: 5,
    message: "Msg",
    emoji: "😀",
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when panel is closed", () => {
    const { container } = render(
      <EventSidePanel
        selectedEvent={baseEvent}
        isOpen={false}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders header and delete when open with event", () => {
    render(
      <EventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("double-arrow-right")).toBeInTheDocument();
    expect(screen.getByText("Edit event")).toBeInTheDocument();
    expect(screen.getByTestId("trash-icon")).toBeInTheDocument();
    expect(screen.getByText("Delete event")).toBeInTheDocument();
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <EventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={onClose}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    const overlay = container.querySelector(".flex-1.bg-black.bg-opacity-50") as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders trigger conditions component for event types", () => {
    const eventWithTrigger = {
      ...baseEvent,
      detectionType: "SENTENCE_SIMILARITY",
      sentences: ["sentence1", "sentence2"],
      triggerCondition: { speaker: "speaker1" },
    };

    render(
      <EventSidePanel
        selectedEvent={eventWithTrigger}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );

    expect(screen.getByTestId("trigger-conditions")).toBeInTheDocument();
    expect(screen.getByText(/Event Type: SENTENCE_SIMILARITY/)).toBeInTheDocument();
  });

  it("calls onDelete with event id when delete is clicked", () => {
    const onDelete = vi.fn();
    render(
      <EventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={onDelete}
        onUpdate={vi.fn()}
      />,
    );

    const del = screen.getByText("Delete event");
    fireEvent.click(del);
    expect(onDelete).toHaveBeenCalledWith("evt-1");
  });
});
