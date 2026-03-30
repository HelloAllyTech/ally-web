import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@components/mapped-event-side-panel", () => ({
  MappedEventSidePanel: () => null,
}));

import { TimeInput } from "../TimeInput";

describe("TimeInput", () => {
  it("renders with placeholder", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText("hh:mm:ss");
    expect(input).toBeInTheDocument();
  });

  it("formats input automatically with colons", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "123456" } });
    expect(input.value).toBe("12:34:56");
    expect(mockOnChange).toHaveBeenCalledWith("12:34:56");
  });

  it("formats partial input with colons", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "12" } });
    expect(input.value).toBe("12");
    expect(mockOnChange).toHaveBeenCalledWith("12");

    fireEvent.change(input, { target: { value: "123" } });
    expect(input.value).toBe("12:3");
    expect(mockOnChange).toHaveBeenCalledWith("12:3");
  });

  it("removes non-digit characters", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "12abc34" } });
    expect(input.value).toBe("12:34");
    expect(mockOnChange).toHaveBeenCalledWith("12:34");
  });

  it("limits input to 6 digits", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "12345678" } });
    expect(input.value).toBe("12:34:56");
    expect(mockOnChange).toHaveBeenCalledWith("12:34:56");
  });

  it("handles paste event", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.paste(input, {
      clipboardData: {
        getData: () => "143025",
      },
    });

    expect(input.value).toBe("14:30:25");
    expect(mockOnChange).toHaveBeenCalledWith("14:30:25");
  });

  it("handles paste with non-digit characters", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.paste(input, {
      clipboardData: {
        getData: () => "14:30:25",
      },
    });

    expect(input.value).toBe("14:30:25");
    expect(mockOnChange).toHaveBeenCalledWith("14:30:25");
  });

  it("limits pasted content to 6 digits", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.paste(input, {
      clipboardData: {
        getData: () => "123456789",
      },
    });

    expect(input.value).toBe("12:34:56");
    expect(mockOnChange).toHaveBeenCalledWith("12:34:56");
  });

  it("syncs with external value changes", () => {
    const mockOnChange = vi.fn();
    const { rerender } = render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("");

    rerender(<TimeInput value="10:30:45" onChange={mockOnChange} />);
    expect(input.value).toBe("10:30:45");
  });

  it("handles disabled state", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} disabled />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("handles empty value", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "12" } });
    expect(mockOnChange).toHaveBeenCalledWith("12");

    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(mockOnChange).toHaveBeenCalledWith("");
  });

  it("allows custom placeholder", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} placeholder="Enter time" />);

    const input = screen.getByPlaceholderText("Enter time");
    expect(input).toBeInTheDocument();
  });

  it("allows custom className", () => {
    const mockOnChange = vi.fn();
    const { container } = render(
      <TimeInput value="" onChange={mockOnChange} className="custom-class" />,
    );

    const input = container.querySelector("input");
    expect(input?.className).toContain("custom-class");
  });

  it("works without onChange handler", () => {
    render(<TimeInput value="12:34:56" />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("12:34:56");

    fireEvent.change(input, { target: { value: "123" } });
    expect(input.value).toBe("12:3");
  });

  describe("Range Validation", () => {
    afterEach(() => {
      cleanup();
    });

    it("should not show error for valid time within range", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="00:10:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.queryByText(/Minimum time is/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Maximum time is/)).not.toBeInTheDocument();
    });

    it("should show error when time is below minimum", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="00:03:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.getByText("Minimum time is 00:05:00")).toBeInTheDocument();
    });

    it("should show error when time exceeds maximum", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="02:00:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.getByText("Maximum time is 01:30:00")).toBeInTheDocument();
    });

    it("should accept minimum boundary value", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="00:05:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.queryByText(/Minimum time is/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Maximum time is/)).not.toBeInTheDocument();
    });

    it("should accept maximum boundary value", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="01:30:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.queryByText(/Minimum time is/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Maximum time is/)).not.toBeInTheDocument();
    });

    it("should clear error when valid value is entered after invalid", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      const { rerender } = render(
        <TimeInput
          value="00:03:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.getByText("Minimum time is 00:05:00")).toBeInTheDocument();

      rerender(
        <TimeInput
          value="00:10:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      fireEvent.blur(input);
      expect(screen.queryByText(/Minimum time is/)).not.toBeInTheDocument();
    });

    it("should work without minTime and maxTime", () => {
      cleanup();

      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      const { container, unmount } = render(
        <TimeInput value="00:10:00" onChange={mockOnChange} onBlur={mockOnBlur} />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      const errorElements = container.querySelectorAll(".text-destructive-500");
      expect(errorElements.length).toBe(0);

      unmount();
    });

    it("should apply error border styling when error exists", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="00:03:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(input.className).toContain("border-destructive-500");
    });

    it("should not show error when showError is false", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="00:03:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
          maxTime="01:30:00"
          showError={false}
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.queryByText(/Minimum time is/)).not.toBeInTheDocument();
    });

    it("should display external error prop", () => {
      const mockOnChange = vi.fn();
      render(
        <TimeInput
          value="00:10:00"
          onChange={mockOnChange}
          error="Custom error message"
          minTime="00:05:00"
          maxTime="01:30:00"
        />,
      );

      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });

    it("should handle only minTime constraint", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="00:03:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          minTime="00:05:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.getByText("Minimum time is 00:05:00")).toBeInTheDocument();
    });

    it("should handle only maxTime constraint", () => {
      const mockOnChange = vi.fn();
      const mockOnBlur = vi.fn();
      render(
        <TimeInput
          value="02:00:00"
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          maxTime="01:30:00"
        />,
      );

      const input = screen.getByRole("textbox") as HTMLInputElement;
      fireEvent.blur(input);

      expect(screen.getByText("Maximum time is 01:30:00")).toBeInTheDocument();
    });
  });
});
