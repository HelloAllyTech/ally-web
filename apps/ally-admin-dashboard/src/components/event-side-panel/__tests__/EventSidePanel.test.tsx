import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { EventSidePanel } from "../EventSidePanel";

vi.mock("@assets", () => ({
  ArrowDownFilled: () => <svg data-testid="arrow-down" />,
  DoubleArrowRight: () => <svg data-testid="double-arrow-right" />,
  Trash: () => <svg data-testid="trash-icon" />,
}));

vi.mock("@components", () => ({
  AutoExpandableTextarea: ({
    value = "",
    onChange = () => {},
    placeholder = "",
    className = "",
  }: any) => (
    <textarea
      data-testid="auto-textarea"
      value={value}
      placeholder={placeholder}
      className={className}
      onChange={e => onChange(e.target.value)}
    />
  ),
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
}));

vi.mock("@constants", () => ({
  SPEAKER_OPTIONS: [
    { label: "Speaker 1", value: "speaker1" },
    { label: "Speaker 2", value: "speaker2" },
  ],
  en: { simulation: { editEvent: "Edit event", deleteEvent: "Delete event" } },
}));

vi.mock("@hooks", () => ({
  useDebounce: (fn: any) => fn,
}));

vi.mock("@utils", () => ({
  formatCapitalizedEnum: (v: any) => v,
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

  it("initializes inputs from selectedEvent and updates name", () => {
    const onUpdate = vi.fn();
    render(
      <EventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    const nameInput = screen.getByPlaceholderText("New Event") as HTMLInputElement;
    expect(nameInput.value).toBe("Test Event");

    fireEvent.change(nameInput, { target: { value: "Updated Event" } });
    const lastCall = onUpdate.mock.calls.at(-1)?.[0];
    expect(lastCall?.name).toBe("Updated Event");
  });

  it("opens speaker dropdown and selects an option", () => {
    const onUpdate = vi.fn();
    const { container } = render(
      <EventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    const speakerButton = within(container).getByRole("button", {
      name: /add speaker|speaker1|speaker2/i,
    });
    fireEvent.click(speakerButton);

    const option = screen.getByText("Speaker 2");
    fireEvent.click(option);

    const lastCall = onUpdate.mock.calls.at(-1)?.[0];
    expect(lastCall?.speaker).toBe("speaker2");
  });

  it("changes number input and emoji, calling onUpdate with new values", () => {
    const onUpdate = vi.fn();
    render(
      <EventSidePanel
        selectedEvent={baseEvent}
        isOpen={true}
        onClose={vi.fn()}
        onDelete={vi.fn()}
        onUpdate={onUpdate}
      />,
    );

    // Number input
    const num = screen.getByLabelText("number-input");
    fireEvent.change(num, { target: { value: "9" } });

    // Emoji click via mock
    const emojiButton = screen.getByTestId("emoji-picker-mock");
    fireEvent.click(emojiButton);

    const lastCall = onUpdate.mock.calls.at(-1)?.[0];
    expect(lastCall?.score).toBe(9);
    expect(lastCall?.emoji).toBe("😊");
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
