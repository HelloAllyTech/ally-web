import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock constants early to avoid importing heavy module chain
vi.mock("@constants", () => ({
  en: {
    simulation: {
      editEvent: "Edit Event",
      deleteEvent: "Delete Event",
    },
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
}));

// Lightweight assets
vi.mock("@assets", () => ({
  ArrowDownFilled: () => <svg data-testid="arrow-down" />,
  DoubleArrowRight: () => <svg data-testid="double-arrow" />,
  Trash: () => <svg data-testid="trash" />,
}));

// Stub child components from @components to simple interactive elements
vi.mock("@components", () => ({
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button aria-label={label} onClick={() => onChange(!enabled)}>
      toggle
    </button>
  ),
  EmojiPickerComponent: ({ onEmojiClick, buttonText, disabled }: any) => (
    <button disabled={disabled} onClick={() => onEmojiClick("😀")}>
      {buttonText}
    </button>
  ),
  NumberInput: ({ value, onChange, disabled }: any) => (
    <input
      type="number"
      aria-label="score"
      defaultValue={value}
      disabled={disabled}
      onChange={e => onChange(Number(e.target.value))}
    />
  ),
  AutoExpandableTextarea: ({ value, onChange, placeholder, disabled }: any) => (
    <textarea
      aria-label={placeholder}
      defaultValue={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

// Use real hooks; they are simple and already tested

import { MAPPED_EVENT_FIELDS } from "@utils";

import { MappedEventSidePanel } from "../MappedEventSidePanel";

describe("MappedEventSidePanel", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  const baseEvent = {
    id: { value: "e1" },
    feedbackStatus: { value: false },
    emoji: { value: "", disabled: false },
    message: { value: "", disabled: false },
    score: { value: 0, disabled: false },
    branchingStatus: { value: false },
    branchInstruction: { value: "", disabled: false },
  } as any;

  const sessionEvents = [{ id: "e1", name: "Event One" }];
  const options = [
    { label: "Event One", value: "e1" },
    { label: "Event Two", value: "e2" },
  ];

  it("renders nothing when closed", () => {
    const { container } = render(
      <MappedEventSidePanel
        selectedEvent={baseEvent}
        isOpen={false}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        sessionEvents={sessionEvents as any}
        availableEventOptions={options}
        onEventSelect={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls onDelete when delete is clicked", () => {
    const onDelete = vi.fn();
    render(
      <MappedEventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={onDelete}
        onUpdate={vi.fn()}
        sessionEvents={sessionEvents as any}
        availableEventOptions={options}
        onEventSelect={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Delete Event"));
    expect(onDelete).toHaveBeenCalledWith("e1");
  });

  it("opens dropdown for new event and selects an option", () => {
    const onSelect = vi.fn();
    const newEvent = { ...baseEvent, id: { value: "" } };
    render(
      <MappedEventSidePanel
        selectedEvent={newEvent}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        sessionEvents={sessionEvents as any}
        availableEventOptions={options}
        onEventSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText("Select an event"));
    fireEvent.change(screen.getByPlaceholderText("Search events"), { target: { value: "two" } });
    fireEvent.click(screen.getByText("Event Two"));
    expect(onSelect).toHaveBeenCalledWith("e2");
  });

  it("debounces updates when toggling feedback status and updates dependents", async () => {
    const onUpdate = vi.fn();
    vi.useFakeTimers();

    render(
      <MappedEventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
        sessionEvents={sessionEvents as any}
        availableEventOptions={options}
        onEventSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Real time feedback status" }));

    // advance debounce
    vi.advanceTimersByTime(500);

    expect(onUpdate).toHaveBeenCalled();
    const updated = onUpdate.mock.calls[0][0];
    expect(updated[MAPPED_EVENT_FIELDS.FEEDBACK_STATUS].value).toBe(true);
    // Dependent fields should be enabled (disabled=false) when feedback is enabled
    expect(updated[MAPPED_EVENT_FIELDS.SCORE].disabled).toBe(false);
    expect(updated[MAPPED_EVENT_FIELDS.EMOJI].disabled).toBe(false);
    expect(updated[MAPPED_EVENT_FIELDS.MESSAGE].disabled).toBe(false);
  });

  it("closes when overlay is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <MappedEventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={onClose}
        onDelete={vi.fn()}
        onUpdate={vi.fn()}
        sessionEvents={sessionEvents as any}
        availableEventOptions={options}
        onEventSelect={vi.fn()}
      />,
    );
    // The overlay is the first child of the root container
    const root = container.firstChild as Element;
    const overlay = root.firstChild as Element;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});
