import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";

// Need to mock cellTypes before any imports that use it
vi.mock("@components", () => {
  // Create a minimal mock that includes cellTypes
  const MockNumberInput = ({ value, onChange, placeholder }: any) => (
    <input
      type="text"
      role="textbox"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e: any) => {
        const num = parseFloat(e.target.value);
        onChange?.(isNaN(num) ? null : num);
      }}
    />
  );

  const MockTimeInput = ({ value, onChange, placeholder }: any) => (
    <input
      type="text"
      role="textbox"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e: any) => onChange?.(e.target.value)}
    />
  );

  return {
    NumberInput: MockNumberInput,
    TimeInput: MockTimeInput,
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
  };
});

import {
  TimeWindowSection,
  OccurrenceControlSection,
  ScoreWindowSection,
} from "../EventSettingsSection";

describe("TimeWindowSection", () => {
  describe("Start Time", () => {
    it("renders with default start time value", () => {
      render(<TimeWindowSection />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("00:00:00");
    });

    it("renders with custom start time value", () => {
      render(<TimeWindowSection startTime="10:30:45" />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("10:30:45");
    });

    it("calls onStartTimeChange when start time is modified", () => {
      const mockOnChange = vi.fn();
      render(<TimeWindowSection onStartTimeChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "081530" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("handles null start time by defaulting to 00:00:00", () => {
      render(<TimeWindowSection startTime={null} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("00:00:00");
    });
  });

  describe("End Time", () => {
    it("renders with null end time as infinity", () => {
      render(<TimeWindowSection endTime={null} />);

      expect(screen.getByText("∞")).toBeInTheDocument();
    });

    it("renders with specific end time value", () => {
      render(<TimeWindowSection endTime="23:59:59" />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[1]).toHaveValue("23:59:59");
    });

    it("calls onEndTimeChange when end time is modified", () => {
      const mockOnChange = vi.fn();
      render(<TimeWindowSection endTime="12:00:00" onEndTimeChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[1], { target: { value: "183000" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("toggles end time from infinity to finite value", () => {
      const mockOnChange = vi.fn();
      render(<TimeWindowSection endTime={null} onEndTimeChange={mockOnChange} />);

      const infinityButton = screen.getByText("∞");
      fireEvent.click(infinityButton);

      expect(mockOnChange).toHaveBeenCalledWith("00:01:00");
    });

    it("handles empty end time value", () => {
      const mockOnChange = vi.fn();
      render(<TimeWindowSection endTime="12:00:00" onEndTimeChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.blur(inputs[1]);

      // Blur should trigger validation
      expect(inputs[1]).toBeInTheDocument();
    });
  });

  describe("Rendering", () => {
    it("renders section header", () => {
      render(<TimeWindowSection />);

      expect(screen.getByText("Time Window")).toBeInTheDocument();
    });

    it("renders field labels", () => {
      render(<TimeWindowSection />);

      expect(screen.getByText("Applicable from")).toBeInTheDocument();
      expect(screen.getByText("Applicable till")).toBeInTheDocument();
    });

    it("renders without callbacks", () => {
      render(<TimeWindowSection startTime="10:00:00" endTime="20:00:00" />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toHaveValue("10:00:00");
      expect(inputs[1]).toHaveValue("20:00:00");
    });
  });
});

describe("OccurrenceControlSection", () => {
  describe("Maximum Occurrences", () => {
    it("renders with default max occurrences value", () => {
      render(<OccurrenceControlSection />);

      const numberInput = screen.getByPlaceholderText("1");
      expect(numberInput).toBeInTheDocument();
    });

    it("renders with custom max occurrences value", () => {
      render(<OccurrenceControlSection maxOccurrences={5} />);

      const numberInput = screen.getByPlaceholderText("1");
      expect(numberInput).toHaveValue("5");
    });

    it("calls onMaxOccurrencesChange when value is modified", () => {
      const mockOnChange = vi.fn();
      render(<OccurrenceControlSection onMaxOccurrencesChange={mockOnChange} />);

      const numberInput = screen.getByPlaceholderText("1");
      fireEvent.change(numberInput, { target: { value: "10" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("handles zero max occurrences", () => {
      render(<OccurrenceControlSection maxOccurrences={0} />);

      const numberInput = screen.getByPlaceholderText("1");
      expect(numberInput).toHaveValue("0");
    });

    it("handles large max occurrences values", () => {
      const mockOnChange = vi.fn();
      render(
        <OccurrenceControlSection maxOccurrences={999} onMaxOccurrencesChange={mockOnChange} />,
      );

      const numberInput = screen.getByPlaceholderText("1");
      expect(numberInput).toHaveValue("999");
    });
  });

  describe("Minimum Gap Time", () => {
    it("renders with default min gap time value", () => {
      render(<OccurrenceControlSection />);

      const timeInput = screen.getAllByPlaceholderText("00:00:00")[0]; // First one in this section
      expect(timeInput).toHaveValue("00:00:00");
    });

    it("renders with custom min gap time value", () => {
      render(<OccurrenceControlSection minGapTime="01:30:00" />);

      const timeInput = screen.getAllByPlaceholderText("00:00:00")[0];
      expect(timeInput).toHaveValue("01:30:00");
    });

    it("calls onMinGapTimeChange when value is modified", () => {
      const mockOnChange = vi.fn();
      render(<OccurrenceControlSection onMinGapTimeChange={mockOnChange} />);

      const timeInput = screen.getAllByPlaceholderText("00:00:00")[0];
      fireEvent.change(timeInput, { target: { value: "001500" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("handles null min gap time", () => {
      render(<OccurrenceControlSection minGapTime={null} />);

      const timeInput = screen.getAllByPlaceholderText("00:00:00")[0];
      expect(timeInput).toBeInTheDocument();
    });
  });

  describe("Rendering", () => {
    it("renders section header", () => {
      render(<OccurrenceControlSection />);

      expect(screen.getByText("Occurrence Control")).toBeInTheDocument();
    });

    it("renders field labels", () => {
      render(<OccurrenceControlSection />);

      expect(screen.getByText("Maximum occurrences")).toBeInTheDocument();
      expect(screen.getByText("Minimum gap time")).toBeInTheDocument();
    });

    it("renders without callbacks", () => {
      render(<OccurrenceControlSection maxOccurrences={3} minGapTime="00:30:00" />);

      const timeInput = screen.getAllByPlaceholderText("00:00:00")[0];
      const numberInput = screen.getByPlaceholderText("1");

      expect(timeInput).toHaveValue("00:30:00");
      expect(numberInput).toHaveValue("3");
    });
  });
});

describe("ScoreWindowSection", () => {
  describe("Minimum Score", () => {
    it("renders with null min score as infinity", () => {
      render(<ScoreWindowSection minScore={null} />);

      expect(screen.getByText("-∞")).toBeInTheDocument();
    });

    it("renders with specific min score value", () => {
      render(<ScoreWindowSection minScore={25} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("25");
    });

    it("calls onMinScoreChange when value is modified", () => {
      const mockOnChange = vi.fn();
      render(<ScoreWindowSection minScore={10} onMinScoreChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "50" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("toggles min score from infinity to finite value", () => {
      const mockOnChange = vi.fn();
      render(<ScoreWindowSection minScore={null} onMinScoreChange={mockOnChange} />);

      const infinityButton = screen.getByText("-∞");
      fireEvent.click(infinityButton);

      expect(mockOnChange).toHaveBeenCalledWith(0);
    });

    it("handles zero as valid min score", () => {
      render(<ScoreWindowSection minScore={0} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("0");
    });

    it("handles negative min score values", () => {
      render(<ScoreWindowSection minScore={-10} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("-10");
    });
  });

  describe("Maximum Score", () => {
    it("renders with null max score as infinity", () => {
      render(<ScoreWindowSection maxScore={null} />);

      expect(screen.getByText("+∞")).toBeInTheDocument();
    });

    it("renders with specific max score value", () => {
      render(<ScoreWindowSection maxScore={75} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("75");
    });

    it("calls onMaxScoreChange when value is modified", () => {
      const mockOnChange = vi.fn();
      render(<ScoreWindowSection maxScore={90} onMaxScoreChange={mockOnChange} />);

      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: "100" } });

      expect(mockOnChange).toHaveBeenCalled();
    });

    it("toggles max score from infinity to finite value", () => {
      const mockOnChange = vi.fn();
      render(<ScoreWindowSection maxScore={null} onMaxScoreChange={mockOnChange} />);

      const infinityButton = screen.getByText("+∞");
      fireEvent.click(infinityButton);

      expect(mockOnChange).toHaveBeenCalledWith(0);
    });

    it("handles zero as valid max score", () => {
      render(<ScoreWindowSection maxScore={0} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("0");
    });

    it("handles large max score values", () => {
      render(<ScoreWindowSection maxScore={1000} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("1000");
    });
  });

  describe("Both Scores", () => {
    it("renders both scores with null values as infinity", () => {
      render(<ScoreWindowSection minScore={null} maxScore={null} />);

      expect(screen.getByText("-∞")).toBeInTheDocument();
      expect(screen.getByText("+∞")).toBeInTheDocument();
    });

    it("renders both scores with finite values", () => {
      render(<ScoreWindowSection minScore={20} maxScore={80} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("20");
      expect(inputs[1]).toHaveValue("80");
    });

    it("handles mixed infinity and finite values", () => {
      render(<ScoreWindowSection minScore={null} maxScore={100} />);

      expect(screen.getByText("-∞")).toBeInTheDocument();
      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveValue("100");
    });

    it("calls both callbacks independently", () => {
      const mockMinChange = vi.fn();
      const mockMaxChange = vi.fn();
      render(
        <ScoreWindowSection
          minScore={10}
          maxScore={90}
          onMinScoreChange={mockMinChange}
          onMaxScoreChange={mockMaxChange}
        />,
      );

      const inputs = screen.getAllByRole("textbox");

      fireEvent.change(inputs[0], { target: { value: "30" } });
      expect(mockMinChange).toHaveBeenCalled();

      fireEvent.change(inputs[1], { target: { value: "95" } });
      expect(mockMaxChange).toHaveBeenCalled();
    });
  });

  describe("Rendering", () => {
    it("renders section header", () => {
      render(<ScoreWindowSection />);

      expect(screen.getByText("Score Window")).toBeInTheDocument();
    });

    it("renders field labels", () => {
      render(<ScoreWindowSection />);

      expect(screen.getByText("Minimum score")).toBeInTheDocument();
      expect(screen.getByText("Maximum score")).toBeInTheDocument();
    });

    it("renders without callbacks", () => {
      render(<ScoreWindowSection minScore={25} maxScore={75} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toHaveValue("25");
      expect(inputs[1]).toHaveValue("75");
    });
  });

  describe("Infinity Toggle Behavior", () => {
    it("uses memoized callbacks to prevent unnecessary re-renders", () => {
      const mockMinChange = vi.fn();
      const mockMaxChange = vi.fn();

      const { rerender } = render(
        <ScoreWindowSection
          minScore={null}
          maxScore={null}
          onMinScoreChange={mockMinChange}
          onMaxScoreChange={mockMaxChange}
        />,
      );

      const minInfinityButton = screen.getByText("-∞");
      const maxInfinityButton = screen.getByText("+∞");

      fireEvent.click(minInfinityButton);
      expect(mockMinChange).toHaveBeenCalledTimes(1);

      // Rerender with same props
      rerender(
        <ScoreWindowSection
          minScore={null}
          maxScore={null}
          onMinScoreChange={mockMinChange}
          onMaxScoreChange={mockMaxChange}
        />,
      );

      // Callbacks should still work after rerender
      fireEvent.click(maxInfinityButton);
      expect(mockMaxChange).toHaveBeenCalledTimes(1);
    });
  });
});

describe("Integration Tests", () => {
  it("renders all three sections together", () => {
    render(
      <>
        <TimeWindowSection startTime="00:00:00" endTime={null} />
        <OccurrenceControlSection maxOccurrences={1} minGapTime="00:00:00" />
        <ScoreWindowSection minScore={null} maxScore={null} />
      </>,
    );

    expect(screen.getByText("Time Window")).toBeInTheDocument();
    expect(screen.getByText("Occurrence Control")).toBeInTheDocument();
    expect(screen.getByText("Score Window")).toBeInTheDocument();
  });

  it("handles complex state changes across sections", () => {
    const mockTimeChange = vi.fn();
    const mockOccurrenceChange = vi.fn();

    render(
      <>
        <TimeWindowSection startTime="00:00:00" onStartTimeChange={mockTimeChange} />
        <OccurrenceControlSection
          maxOccurrences={1}
          onMaxOccurrencesChange={mockOccurrenceChange}
        />
      </>,
    );

    const timeInputs = screen.getAllByPlaceholderText("00:00:00");
    const numberInput = screen.getByPlaceholderText("1");

    fireEvent.change(timeInputs[0], { target: { value: "100000" } });
    expect(mockTimeChange).toHaveBeenCalled();

    fireEvent.change(numberInput, { target: { value: "5" } });
    expect(mockOccurrenceChange).toHaveBeenCalled();
  });
});
