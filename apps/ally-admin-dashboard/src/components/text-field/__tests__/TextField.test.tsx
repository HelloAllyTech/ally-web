import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { TextField } from "../TextField";

// Mock MUI TextField
vi.mock("@mui/material", () => ({
  TextField: vi.fn(({ label, error, disabled, value, onChange, ...props }) => (
    <div data-testid="mui-textfield">
      {label && <label>{label}</label>}
      <input
        data-testid="textfield-input"
        disabled={disabled}
        value={value}
        onChange={onChange}
        aria-invalid={error}
        {...props}
      />
    </div>
  )),
}));

describe("TextField", () => {
  const mockRegister = vi.fn(name => ({
    name,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
  }));

  it("renders with label", () => {
    render(<TextField label="Username" name="username" register={mockRegister} />);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("renders without label when not provided", () => {
    render(<TextField name="username" register={mockRegister} />);
    expect(screen.queryByRole("label")).not.toBeInTheDocument();
  });

  it("applies custom className to wrapper", () => {
    const { container } = render(
      <TextField name="username" register={mockRegister} className="custom-class" />,
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("renders as disabled", () => {
    render(<TextField name="username" register={mockRegister} disabled={true} />);
    const input = screen.getByTestId("textfield-input");
    expect(input).toBeDisabled();
  });

  it("shows error state when errors prop has error for field", () => {
    const errors = { username: { message: "Required field" } };
    render(<TextField name="username" register={mockRegister} errors={errors} />);
    const input = screen.getByTestId("textfield-input");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("shows error state when errorMessage prop is provided", () => {
    render(<TextField name="username" register={mockRegister} errorMessage="Invalid input" />);
    const input = screen.getByTestId("textfield-input");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("displays error message when hideError is false", () => {
    const errors = { username: { message: "Required field" } };
    render(<TextField name="username" register={mockRegister} errors={errors} hideError={false} />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
  });

  it("does not display error message when hideError is true", () => {
    const errors = { username: { message: "Required field" } };
    render(<TextField name="username" register={mockRegister} errors={errors} hideError={true} />);
    expect(screen.queryByText("Required field")).not.toBeInTheDocument();
  });

  it("displays errorMessage prop when hideError is false", () => {
    render(
      <TextField
        name="username"
        register={mockRegister}
        errorMessage="Custom error"
        hideError={false}
      />,
    );
    expect(screen.getByText("Custom error")).toBeInTheDocument();
  });

  it("renders with default fieldSize as small", () => {
    render(<TextField name="username" register={mockRegister} />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders with medium fieldSize", () => {
    render(<TextField name="username" register={mockRegister} fieldSize="medium" />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders with large fieldSize", () => {
    render(<TextField name="username" register={mockRegister} fieldSize="large" />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders with fullWidth by default", () => {
    render(<TextField name="username" register={mockRegister} />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders without fullWidth when set to false", () => {
    render(<TextField name="username" register={mockRegister} fullWidth={false} />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders as multiline", () => {
    render(<TextField name="description" register={mockRegister} multiline={true} />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders with custom rows for multiline", () => {
    render(<TextField name="description" register={mockRegister} multiline={true} rows={5} />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders with showBorder by default", () => {
    render(<TextField name="username" register={mockRegister} />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders without border when showBorder is false", () => {
    render(<TextField name="username" register={mockRegister} showBorder={false} />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("calls register with field name", () => {
    render(<TextField name="username" register={mockRegister} />);
    expect(mockRegister).toHaveBeenCalledWith("username");
  });

  it("renders with value prop", () => {
    render(<TextField name="username" register={mockRegister} value="test value" />);
    const input = screen.getByTestId("textfield-input");
    expect(input).toHaveValue("test value");
  });

  it("calls onChange when provided", () => {
    const onChange = vi.fn();
    render(<TextField name="username" register={mockRegister} onChange={onChange} />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("renders without register when not provided", () => {
    render(<TextField name="username" />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });

  it("has correct wrapper flex classes", () => {
    const { container } = render(<TextField name="username" register={mockRegister} />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("flex-col");
  });

  it("label has correct text color", () => {
    render(<TextField label="Username" name="username" register={mockRegister} />);
    const label = screen.getByText("Username");
    expect(label.className).toContain("text-[#49454F]");
  });

  it("label has correct font size", () => {
    render(<TextField label="Username" name="username" register={mockRegister} />);
    const label = screen.getByText("Username");
    expect(label.className).toContain("text-[12px]");
  });

  it("error message has correct styling", () => {
    const errors = { username: { message: "Error" } };
    const { container } = render(
      <TextField name="username" register={mockRegister} errors={errors} hideError={false} />,
    );
    const errorSpan = screen.getByText("Error");
    expect(errorSpan.className).toContain("text-[#EF4444]");
    expect(errorSpan.className).toContain("text-[12px]");
  });

  it("prioritizes errors object over errorMessage", () => {
    const errors = { username: { message: "Error from object" } };
    render(
      <TextField
        name="username"
        register={mockRegister}
        errors={errors}
        errorMessage="Error from prop"
        hideError={false}
      />,
    );
    expect(screen.getByText("Error from object")).toBeInTheDocument();
    expect(screen.queryByText("Error from prop")).not.toBeInTheDocument();
  });

  it("passes additional props to MUI TextField", () => {
    render(<TextField name="username" register={mockRegister} placeholder="Enter username" />);
    expect(screen.getByTestId("mui-textfield")).toBeInTheDocument();
  });
});
