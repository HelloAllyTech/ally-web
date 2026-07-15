import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import TextField from "../TextField";

describe("TextField", () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    name: "test-input",
    onChange: mockOnChange,
    value: "initial value",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the label correctly", () => {
    const labelText = "User Name";
    render(<TextField {...defaultProps} label={labelText} hideError={true} />);
    // The Carbon input is wired to the label text
    expect(screen.getByLabelText(labelText)).toBeInTheDocument();
  });

  it("should update value and call onChange on input", () => {
    render(<TextField {...defaultProps} />);
    const input = screen.getByRole("textbox");

    expect(input).toHaveValue("initial value");

    fireEvent.change(input, { target: { value: "new value" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it("should pass disabled prop to the Carbon input", () => {
    render(<TextField {...defaultProps} disabled={true} />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
  });

  it("should not draw a border around adornments when showBorder is false", () => {
    render(
      <TextField
        {...defaultProps}
        showBorder={false}
        InputProps={{ startAdornment: <span data-testid="adorn" /> }}
      />,
    );
    const wrapper = screen.getByTestId("adorn").parentElement as HTMLElement;
    expect(wrapper).not.toHaveClass("border");
  });

  it("should draw a border around adornments when showBorder is true", () => {
    render(
      <TextField
        {...defaultProps}
        showBorder={true}
        InputProps={{ startAdornment: <span data-testid="adorn" /> }}
      />,
    );
    const wrapper = screen.getByTestId("adorn").parentElement as HTMLElement;
    expect(wrapper).toHaveClass("border");
  });

  describe("Scroll-wheel value change guard", () => {
    // <input type="number"> silently increments/decrements on scroll while
    // focused (a browser default, not a React/MUI behavior) — reported as a
    // saved custom field value drifting with no one editing it.
    it("blurs a focused number input on wheel so scrolling can't change its value", () => {
      render(<TextField {...defaultProps} type="number" />);
      const input = screen.getByRole("spinbutton");
      input.focus();
      expect(input).toHaveFocus();

      fireEvent.wheel(input);

      expect(input).not.toHaveFocus();
    });

    it("does not blur a non-number input on wheel", () => {
      render(<TextField {...defaultProps} type="text" />);
      const input = screen.getByRole("textbox");
      input.focus();
      expect(input).toHaveFocus();

      fireEvent.wheel(input);

      expect(input).toHaveFocus();
    });
  });

  describe("Error Handling", () => {
    it("should display string errorMessage when hideError is false", () => {
      const errorMessage = "This field is required.";
      render(<TextField {...defaultProps} errorMessage={errorMessage} hideError={false} />);
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("should mark the input invalid when errorMessage is present", () => {
      render(<TextField {...defaultProps} errorMessage="Error" hideError={true} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("data-invalid", "true");
    });

    it("should display react-hook-form error message when hideError is false", () => {
      const formError = "RHF validation failed.";
      const errors = {
        "test-input": { message: formError, type: "required" },
      };
      render(<TextField {...defaultProps} errors={errors} hideError={false} />);
      expect(screen.getByText(formError)).toBeInTheDocument();
    });

    it("should hide the error message when hideError is true", () => {
      const errorMessage = "Hidden Error";
      render(<TextField {...defaultProps} errorMessage={errorMessage} hideError={true} />);
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });

  describe("Size and Multiline", () => {
    it("should render a textarea with the given rows when multiline is true", () => {
      const mockRows = 5;
      const { container } = render(
        <TextField {...defaultProps} multiline={true} rows={mockRows} />,
      );

      const textarea = container.querySelector("textarea");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute("rows", String(mockRows));
    });

    it.each([
      ["small", "cds--text-input--sm"],
      ["medium", "cds--text-input--md"],
      ["large", "cds--text-input--lg"],
    ])('should apply the Carbon size class for fieldSize="%s"', (size, expectedClass) => {
      render(<TextField {...defaultProps} fieldSize={size as "small" | "medium" | "large"} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass(expectedClass);
    });
  });
});
