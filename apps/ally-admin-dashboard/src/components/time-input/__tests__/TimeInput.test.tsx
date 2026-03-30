import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { TimeInput } from "../TimeInput";

describe("TimeInput", () => {
  it("renders with placeholder", () => {
    const mockOnChange = vi.fn();
    render(<TimeInput value="" onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText("hh:mm:ss");
    expect(input).toBeInTheDocument();
  });

  it("formats input automaticlifeline with colons", () => {
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
});
