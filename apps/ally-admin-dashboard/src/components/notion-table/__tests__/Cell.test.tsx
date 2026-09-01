import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Cell } from "../Cell";
import { cellTypes } from "../utils";

vi.mock("@assets", () => ({
  Trash: () => <svg data-testid="trash-icon" />,
  PlayIcon: (props: any) => <svg data-testid="play-icon" {...props} />,
  PauseIcon: (props: any) => <svg data-testid="pause-icon" {...props} />,
}));

// Mock the child components
vi.mock("@components", () => ({
  EmojiPickerComponent: ({ onEmojiClick, buttonText, disabled }: any) => (
    <button
      data-testid="emoji-picker"
      onClick={() => !disabled && onEmojiClick("😀")}
      disabled={disabled}
    >
      {buttonText || "Pick emoji"}
    </button>
  ),
  TimeInput: ({ value, onBlur, disabled, className }: any) => (
    <input
      data-testid="time-input"
      type="text"
      value={value || ""}
      onBlur={e => onBlur?.(e.target.value)}
      disabled={disabled}
      className={className}
    />
  ),
  TagList: ({ tags, emptyText }: any) => (
    <div data-testid="tag-list">
      {Array.isArray(tags) && tags.length > 0 ? (
        tags.map((tag: string, i: number) => <span key={i}>{tag}</span>)
      ) : (
        <span>{emptyText || "-"}</span>
      )}
    </div>
  ),
  HelperTag: ({ tags, updateTags, disabled }: any) => (
    <div data-testid="helper-tag">
      <input
        data-testid="helper-tag-input"
        type="checkbox"
        disabled={disabled}
        onChange={() => updateTags?.([...tags, { id: "new", name: "new" }])}
      />
    </div>
  ),
  // Export cellTypes to prevent other tests from failing
  cellTypes: {
    editableText: "editableText",
    dropdown: "dropdown",
    dropdownSearchable: "dropdownSearchable",
    number: "number",
    select: "select",
    multiSelect: "multiSelect",
    switch: "switch",
    emoji: "emoji",
    time: "time",
    triggerConditions: "triggerConditions",
    detectionConfig: "detectionConfig",
  },
}));

vi.mock("@components/notion-table", () => ({
  EditableTextPopup: ({ value, onChange, disabled, placeholder }: any) => (
    <div data-testid="editable-text-popup">
      <input
        data-testid="editable-input"
        value={value || ""}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  ),
  NumberInput: ({ value, onChange, disabled }: any) => (
    <div data-testid="number-input">
      <input
        data-testid="number-input-field"
        type="number"
        value={value || 0}
        onChange={event => onChange(Number(event.target.value))}
        disabled={disabled}
      />
    </div>
  ),
  TextDropdown: ({ value, options, onChange, disabled, placeholder }: any) => (
    <div data-testid="text-dropdown">
      <select
        data-testid="dropdown-select"
        value={value || ""}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options?.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
  Switch: ({ checked, onChange, disabled }: any) => (
    <div data-testid="switch">
      <input
        data-testid="switch-input"
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        disabled={disabled}
      />
    </div>
  ),
  SelectComponent: ({ value, options, onChange, disabled, placeholder }: any) => (
    <div data-testid="select-component">
      <select
        data-testid="select-component-select"
        value={value || ""}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options?.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
  TextareaWithTriggerDropdown: ({ value, onChange, disabled, placeholder }: any) => (
    <div data-testid="textarea-trigger-dropdown">
      <textarea
        data-testid="textarea-trigger-field"
        value={value || ""}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  ),
}));

vi.mock("@constants", () => ({
  DETECTION_CONFIG_FIELDS: {
    MAX_OCCURRENCES: "maxOccurrences",
    MIN_GAP_TIME: "minGapTime",
    START_TIME: "startTime",
    END_TIME: "endTime",
    MIN_SCORE: "minScore",
    MAX_SCORE: "maxScore",
  },
}));

vi.mock("@utils", () => ({
  formatCapitalizedEnum: (text: string) => text,
  isInfinityValue: (value: any) => value === null || value === undefined,
  normalizeDetectionConfigValue: (value: any, fieldId: string) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "object" && value !== null && "value" in value) {
      return value.value;
    }
    return value;
  },
  getInfinityDisplay: (fieldId: string) => {
    if (fieldId === "minScore") return "-∞";
    if (fieldId === "maxScore") return "+∞";
    return "∞";
  },
  toggleInfinityValue: (currentValue: any, fieldId: string) => {
    if (currentValue === null || currentValue === undefined) {
      if (fieldId === "endTime") return "00:01:00";
      if (fieldId === "minScore" || fieldId === "maxScore") return 0;
      return "00:00:00";
    }
    return null;
  },
}));

describe("Cell", () => {
  const defaultColumn = {
    dataType: cellTypes.normalText,
    id: "test-column",
    minWidth: 100,
    width: 200,
    placeholder: "Enter text",
    options: [],
  };

  const defaultProps = {
    value: "Test value",
    rowIndex: 0,
    column: defaultColumn,
    onCellChange: vi.fn(),
    row: { id: 1, name: "Test row" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Normal Text Cell", () => {
    it("renders normal text cell correctly", () => {
      render(<Cell {...defaultProps} />);

      expect(screen.getByText("Test value")).toBeInTheDocument();
    });

    it("handles empty text value", () => {
      const { container } = render(<Cell {...defaultProps} value="" />);

      const span = container.querySelector("span");
      expect(span).toBeInTheDocument();
      expect(span).toBeEmptyDOMElement();
    });

    it("handles object value with value property", () => {
      const objectValue = { value: "Object value", disabled: false };
      render(<Cell {...defaultProps} value={objectValue} />);

      expect(screen.getByText("Object value")).toBeInTheDocument();
    });
  });

  describe("Editable Text Cell", () => {
    const editableColumn = { ...defaultColumn, dataType: cellTypes.editableText };

    it("renders editable text popup", () => {
      render(<Cell {...defaultProps} column={editableColumn} />);

      expect(screen.getByTestId("editable-text-popup")).toBeInTheDocument();
    });

    it("calls onCellChange when text is edited", () => {
      const mockOnCellChange = vi.fn();
      render(<Cell {...defaultProps} column={editableColumn} onCellChange={mockOnCellChange} />);

      const input = screen.getByTestId("editable-input");
      fireEvent.change(input, { target: { value: "New value" } });

      expect(mockOnCellChange).toHaveBeenCalledWith({
        columnId: "test-column",
        rowIndex: 0,
        value: "New value",
        row: { id: 1, name: "Test row" },
        rowId: undefined,
      });
    });

    it("respects disabled state for editable text", () => {
      const disabledValue = { value: "Disabled text", disabled: true };
      render(<Cell {...defaultProps} value={disabledValue} column={editableColumn} />);

      const input = screen.getByTestId("editable-input");
      expect(input).toBeDisabled();
    });

    it("passes placeholder to editable text", () => {
      render(<Cell {...defaultProps} value="" column={editableColumn} />);

      const input = screen.getByTestId("editable-input");
      expect(input).toHaveAttribute("placeholder", "Enter text");
    });
  });

  describe("Dropdown Cell", () => {
    const dropdownOptions = [
      { label: "Option 1", value: "opt1" },
      { label: "Option 2", value: "opt2" },
      { label: "Option 3", value: "opt3" },
    ];
    const dropdownColumn = {
      ...defaultColumn,
      dataType: cellTypes.dropdown,
      options: dropdownOptions,
    };

    it("renders dropdown with options", () => {
      render(<Cell {...defaultProps} value="opt1" column={dropdownColumn} />);

      expect(screen.getByTestId("text-dropdown")).toBeInTheDocument();
      const select = screen.getByTestId("dropdown-select");
      expect(select).toHaveValue("opt1");
    });

    it("calls onCellChange when dropdown value changes", () => {
      const mockOnCellChange = vi.fn();
      render(
        <Cell
          {...defaultProps}
          value="opt1"
          column={dropdownColumn}
          onCellChange={mockOnCellChange}
        />,
      );

      const select = screen.getByTestId("dropdown-select");
      fireEvent.change(select, { target: { value: "opt2" } });

      expect(mockOnCellChange).toHaveBeenCalledWith({
        columnId: "test-column",
        rowIndex: 0,
        value: "opt2",
        row: { id: 1, name: "Test row" },
        rowId: undefined,
      });
    });

    it("renders the resolved label as plain text instead of a dropdown when disabled", () => {
      const disabledValue = { value: "opt1", disabled: true };
      render(<Cell {...defaultProps} value={disabledValue} column={dropdownColumn} />);

      expect(screen.queryByTestId("text-dropdown")).not.toBeInTheDocument();
      expect(screen.getByText("Option 1")).toBeInTheDocument();
    });
  });

  describe("Preview Audio Cell", () => {
    const previewColumn = {
      ...defaultColumn,
      id: "preview",
      dataType: cellTypes.previewAudio,
    };

    it("renders play control for an idle preview", () => {
      const onPlay = vi.fn();
      render(
        <Cell
          {...defaultProps}
          value={{ isPlaying: false, isLoading: false, onPlay, onPause: vi.fn() }}
          column={previewColumn}
        />,
      );

      expect(screen.getByRole("button", { name: "Play voice preview" })).toBeInTheDocument();
      expect(screen.getByTestId("play-icon")).toBeInTheDocument();
    });

    it("calls play handler when play is clicked", () => {
      const onPlay = vi.fn();
      render(
        <Cell
          {...defaultProps}
          value={{ isPlaying: false, isLoading: false, onPlay, onPause: vi.fn() }}
          column={previewColumn}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Play voice preview" }));

      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it("calls pause handler when pause is clicked", () => {
      const onPause = vi.fn();
      render(
        <Cell
          {...defaultProps}
          value={{ isPlaying: true, isLoading: false, onPlay: vi.fn(), onPause }}
          column={previewColumn}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Pause voice preview" }));

      expect(onPause).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("pause-icon")).toBeInTheDocument();
    });
  });

  describe("Searchable Dropdown Cell", () => {
    const searchableOptions = [
      { label: "Apple", value: "apple" },
      { label: "Banana", value: "banana" },
      { label: "Cherry", value: "cherry" },
    ];
    const searchableColumn = {
      ...defaultColumn,
      dataType: cellTypes.dropdownSearchable,
      options: searchableOptions,
    };

    it("renders searchable dropdown", () => {
      render(<Cell {...defaultProps} value="apple" column={searchableColumn} />);

      expect(screen.getByTestId("text-dropdown")).toBeInTheDocument();
    });

    it("disables dropdown when value exists", () => {
      const valueWithData = { value: "apple", disabled: false };
      render(<Cell {...defaultProps} value={valueWithData} column={searchableColumn} />);

      const select = screen.getByTestId("dropdown-select");
      expect(select).toBeDisabled();
    });

    it("enables dropdown when value is empty", () => {
      render(<Cell {...defaultProps} value="" column={searchableColumn} />);

      const select = screen.getByTestId("dropdown-select");
      expect(select).not.toBeDisabled();
    });
  });

  describe("Number Input Cell", () => {
    const numberColumn = { ...defaultColumn, dataType: cellTypes.number };

    it("renders number input", () => {
      render(<Cell {...defaultProps} value={42} column={numberColumn} />);

      expect(screen.getByTestId("number-input")).toBeInTheDocument();
      const input = screen.getByTestId("number-input-field");
      expect(input).toHaveValue(42);
    });

    it("calls onCellChange when number changes", () => {
      const mockOnCellChange = vi.fn();
      render(
        <Cell {...defaultProps} value={10} column={numberColumn} onCellChange={mockOnCellChange} />,
      );

      const input = screen.getByTestId("number-input-field");
      fireEvent.change(input, { target: { value: "20" } });

      expect(mockOnCellChange).toHaveBeenCalledWith({
        columnId: "test-column",
        rowIndex: 0,
        value: 20,
        row: { id: 1, name: "Test row" },
        rowId: undefined,
      });
    });

    it("respects disabled state for number input", () => {
      const disabledValue = { value: 42, disabled: true };
      render(<Cell {...defaultProps} value={disabledValue} column={numberColumn} />);

      const input = screen.getByTestId("number-input-field");
      expect(input).toBeDisabled();
    });

    it("handles zero value", () => {
      render(<Cell {...defaultProps} value={0} column={numberColumn} />);

      const input = screen.getByTestId("number-input-field");
      expect(input).toHaveValue(0);
    });
  });

  describe("Select Component Cell", () => {
    const selectOptions = [
      { label: "Red", value: "red", backgroundColor: "#ff0000" },
      { label: "Blue", value: "blue", backgroundColor: "#0000ff" },
      { label: "Green", value: "green", backgroundColor: "#00ff00" },
    ];
    const selectColumn = {
      ...defaultColumn,
      dataType: cellTypes.select,
      options: selectOptions,
    };

    it("renders select component", () => {
      render(<Cell {...defaultProps} value="red" column={selectColumn} />);

      expect(screen.getByTestId("select-component")).toBeInTheDocument();
      const select = screen.getByTestId("select-component-select");
      expect(select).toHaveValue("red");
    });

    it("calls onCellChange when selection changes", () => {
      const mockOnCellChange = vi.fn();
      render(
        <Cell
          {...defaultProps}
          value="red"
          column={selectColumn}
          onCellChange={mockOnCellChange}
        />,
      );

      const select = screen.getByTestId("select-component-select");
      fireEvent.change(select, { target: { value: "blue" } });

      expect(mockOnCellChange).toHaveBeenCalledWith({
        columnId: "test-column",
        rowIndex: 0,
        value: "blue",
        row: { id: 1, name: "Test row" },
        rowId: undefined,
      });
    });

    it("respects disabled state for select component", () => {
      const disabledValue = { value: "red", disabled: true };
      render(<Cell {...defaultProps} value={disabledValue} column={selectColumn} />);

      const select = screen.getByTestId("select-component-select");
      expect(select).toBeDisabled();
    });
  });

  describe("Switch Cell", () => {
    const switchColumn = { ...defaultColumn, dataType: cellTypes.switch };

    it("renders switch component", () => {
      render(<Cell {...defaultProps} value="On" column={switchColumn} />);

      expect(screen.getByTestId("switch")).toBeInTheDocument();
      const switchInput = screen.getByTestId("switch-input");
      expect(switchInput).toBeChecked();
    });

    it("handles 'Off' value", () => {
      render(<Cell {...defaultProps} value="Off" column={switchColumn} />);

      const switchInput = screen.getByTestId("switch-input");
      expect(switchInput).not.toBeChecked();
    });

    it("handles boolean true value", () => {
      render(<Cell {...defaultProps} value={true} column={switchColumn} />);

      const switchInput = screen.getByTestId("switch-input");
      expect(switchInput).toBeChecked();
    });

    it("handles boolean false value", () => {
      render(<Cell {...defaultProps} value={false} column={switchColumn} />);

      const switchInput = screen.getByTestId("switch-input");
      expect(switchInput).not.toBeChecked();
    });

    it("calls onCellChange when switch is toggled", () => {
      const mockOnCellChange = vi.fn();
      render(
        <Cell
          {...defaultProps}
          value={false}
          column={switchColumn}
          onCellChange={mockOnCellChange}
        />,
      );

      const switchInput = screen.getByTestId("switch-input");
      fireEvent.click(switchInput);

      expect(mockOnCellChange).toHaveBeenCalledWith({
        columnId: "test-column",
        rowIndex: 0,
        value: true,
        row: { id: 1, name: "Test row" },
        rowId: undefined,
      });
    });

    it("respects disabled state for switch", () => {
      const disabledValue = { value: true, disabled: true };
      render(<Cell {...defaultProps} value={disabledValue} column={switchColumn} />);

      const switchInput = screen.getByTestId("switch-input");
      expect(switchInput).toBeDisabled();
    });
  });

  describe("Emoji Picker Cell", () => {
    const emojiColumn = { ...defaultColumn, dataType: cellTypes.emoji_select };

    it("renders emoji picker", () => {
      render(<Cell {...defaultProps} value="😀" column={emojiColumn} />);

      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
      expect(screen.getByText("😀")).toBeInTheDocument();
    });

    it("calls onCellChange when emoji is selected", () => {
      const mockOnCellChange = vi.fn();
      render(
        <Cell {...defaultProps} value="😀" column={emojiColumn} onCellChange={mockOnCellChange} />,
      );

      const emojiButton = screen.getByTestId("emoji-picker");
      fireEvent.click(emojiButton);

      expect(mockOnCellChange).toHaveBeenCalledWith({
        columnId: "test-column",
        rowIndex: 0,
        value: "😀",
        row: { id: 1, name: "Test row" },
        rowId: undefined,
      });
    });

    it("respects disabled state for emoji picker", () => {
      const disabledValue = { value: "😀", disabled: true };
      render(<Cell {...defaultProps} value={disabledValue} column={emojiColumn} />);

      const emojiButton = screen.getByTestId("emoji-picker");
      expect(emojiButton).toBeDisabled();
    });
  });

  describe("wrapText Cell Type", () => {
    it("renders text with line clamp", () => {
      const wrapColumn = { ...defaultColumn, dataType: cellTypes.wrapText };
      render(<Cell {...defaultProps} value="Short text" column={wrapColumn} />);

      const span = screen.getByText("Short text");
      expect(span).toBeInTheDocument();
      expect(span).toHaveClass("line-clamp-4");
    });

    it("handles undefined value", () => {
      const wrapColumn = { ...defaultColumn, dataType: cellTypes.wrapText };
      const { container } = render(
        <Cell {...defaultProps} value={undefined} column={wrapColumn} />,
      );

      const span = container.querySelector("span");
      expect(span).toBeInTheDocument();
      expect(span).toHaveTextContent("");
    });
  });

  describe("Default/Unknown Cell Type", () => {
    it("renders empty span for unknown cell type", () => {
      const unknownColumn = { ...defaultColumn, dataType: "unknown-type" };
      const { container } = render(<Cell {...defaultProps} column={unknownColumn} />);

      const span = container.querySelector("span");
      expect(span).toBeInTheDocument();
      expect(span).toBeEmptyDOMElement();
    });
  });

  describe("Value Updates", () => {
    it("updates cell value when initialValue changes", async () => {
      const { rerender } = render(<Cell {...defaultProps} value="Initial value" />);

      expect(screen.getByText("Initial value")).toBeInTheDocument();

      rerender(<Cell {...defaultProps} value="Updated value" />);

      await waitFor(() => {
        expect(screen.getByText("Updated value")).toBeInTheDocument();
      });
    });

    it("updates cell value when object value changes", async () => {
      const initialValue = { value: "Initial", disabled: false };
      const { rerender } = render(<Cell {...defaultProps} value={initialValue} />);

      expect(screen.getByText("Initial")).toBeInTheDocument();

      const updatedValue = { value: "Updated", disabled: false };
      rerender(<Cell {...defaultProps} value={updatedValue} />);

      await waitFor(() => {
        expect(screen.getByText("Updated")).toBeInTheDocument();
      });
    });
  });

  describe("rowId Handling", () => {
    it("includes rowId in onCellChange when present", () => {
      const mockOnCellChange = vi.fn();
      const valueWithRowId = { value: "Test", rowId: "row-123" };
      const editableColumn = { ...defaultColumn, dataType: cellTypes.editableText };

      render(
        <Cell
          {...defaultProps}
          value={valueWithRowId}
          column={editableColumn}
          onCellChange={mockOnCellChange}
        />,
      );

      const input = screen.getByTestId("editable-input");
      fireEvent.change(input, { target: { value: "New value" } });

      expect(mockOnCellChange).toHaveBeenCalledWith({
        columnId: "test-column",
        rowIndex: 0,
        value: "New value",
        row: { id: 1, name: "Test row" },
        rowId: "row-123",
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles null value", () => {
      const { container } = render(<Cell {...defaultProps} value={null} />);

      const span = container.querySelector("span");
      expect(span).toBeInTheDocument();
      expect(span).toBeEmptyDOMElement();
    });

    it("handles undefined value", () => {
      const { container } = render(<Cell {...defaultProps} value={undefined} />);

      const span = container.querySelector("span");
      expect(span).toBeInTheDocument();
      expect(span).toBeEmptyDOMElement();
    });

    it("handles missing column properties", () => {
      const minimalColumn = {
        dataType: cellTypes.normalText,
        id: "minimal",
        options: [],
        minWidth: 0,
        width: 0,
        placeholder: "",
      };
      render(<Cell {...defaultProps} column={minimalColumn} />);

      expect(screen.getByText("Test value")).toBeInTheDocument();
    });
  });

  describe("TextAreaWithDropdown and HelperTag", () => {
    it("renders TextareaWithTriggerDropdown with correct placeholder and disabled state", () => {
      const column = {
        dataType: "textAreaWithDropdown",
        id: "test-column",
        placeholder: "Default Placeholder",
      };
      const value = {
        value: "Test description",
        disabled: true,
        placeholder: "Custom Placeholder",
      };

      render(<Cell {...defaultProps} value={value} column={column as any} />);

      const textarea = screen.getByTestId("textarea-trigger-field");
      expect(textarea).toHaveValue("Test description");
      expect(textarea).toBeDisabled();
      expect(textarea).toHaveAttribute("placeholder", "Custom Placeholder");
    });

    it("renders HelperTag with correct disabled state", () => {
      const column = { dataType: "dropdownTags", id: "test-column" };
      const value = { value: [], disabled: true };

      render(<Cell {...defaultProps} value={value} column={column as any} />);

      const helperTagInput = screen.getByTestId("helper-tag-input");
      expect(helperTagInput).toBeDisabled();
    });
  });
});
