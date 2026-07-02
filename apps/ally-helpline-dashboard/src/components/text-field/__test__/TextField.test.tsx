import { TextField as MuiTextField } from "@mui/material";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import TextField from "../TextField";

vi.mock("@mui/material", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    TextField: vi.fn(props => {
      const { value, onChange, disabled, error, multiline, name, type, onWheel } = props;

      return (
        <div data-testid="mui-textfield-root">
          {props.label && <label>{props.label}</label>}
          <input
            data-testid="input"
            name={name}
            type={type}
            value={value || ""}
            onChange={onChange}
            onWheel={onWheel}
            disabled={disabled}
            data-error={error}
            data-multiline={multiline}
          />
        </div>
      );
    }),
  };
});

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
    expect(screen.getByText(labelText)).toBeInTheDocument();
  });

  it("should update value and call onChange on input", () => {
    render(<TextField {...defaultProps} />);
    const input = screen.getByTestId("input");

    expect(input).toHaveValue("initial value");

    fireEvent.change(input, { target: { value: "new value" } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it("should pass disabled prop to MuiTextField", () => {
    render(<TextField {...defaultProps} disabled={true} />);
    const input = screen.getByTestId("input");
    expect(input).toBeDisabled();
  });

  it("should pass showBorder prop logic via MuiTextField sx prop", () => {
    render(<TextField {...defaultProps} showBorder={false} />);

    expect(MuiTextField).toHaveBeenCalledWith(
      expect.objectContaining({
        sx: expect.objectContaining({
          "& .MuiInputBase-root": expect.objectContaining({
            border: "none",
          }),
          "& .MuiOutlinedInput-root": expect.objectContaining({
            "& fieldset": expect.objectContaining({
              border: "none",
            }),
          }),
        }),
      }),
      expect.anything(),
    );
  });

  describe("Scroll-wheel value change guard", () => {
    // <input type="number"> silently increments/decrements on scroll while
    // focused (a browser default, not a React/MUI behavior) — reported as a
    // saved custom field value drifting with no one editing it.
    it("blurs a focused number input on wheel so scrolling can't change its value", () => {
      render(<TextField {...defaultProps} type="number" />);
      const input = screen.getByTestId("input");
      input.focus();
      expect(input).toHaveFocus();

      fireEvent.wheel(input);

      expect(input).not.toHaveFocus();
    });

    it("does not blur a non-number input on wheel", () => {
      render(<TextField {...defaultProps} type="text" />);
      const input = screen.getByTestId("input");
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

    it("should pass error=true to MuiTextField when errorMessage is present", () => {
      render(<TextField {...defaultProps} errorMessage="Error" hideError={true} />);
      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("data-error", "true");
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
    it("should pass multiline=true and rows prop to MuiTextField", () => {
      const mockRows = 5;
      render(<TextField {...defaultProps} multiline={true} rows={mockRows} />);

      expect(MuiTextField).toHaveBeenCalledWith(
        expect.objectContaining({
          multiline: true,
          rows: mockRows,
        }),
        expect.anything(),
      );
    });

    it.each([
      ["small", "30px"],
      ["medium", "40px"],
      ["large", "48px"],
    ])('should apply correct height for fieldSize="%s"', (size, expectedHeight) => {
      render(<TextField {...defaultProps} fieldSize={size as "small" | "medium" | "large"} />);

      expect(MuiTextField).toHaveBeenCalledWith(
        expect.objectContaining({
          sx: expect.objectContaining({
            "& .MuiOutlinedInput-root": expect.objectContaining({
              height: expectedHeight,
            }),
          }),
        }),
        expect.anything(),
      );
    });
  });
});
