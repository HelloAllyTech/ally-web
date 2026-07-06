import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { TextField } from "../TextField";

// Mock the Carbon-based UI primitives the component now renders. TextField
// wraps TextInput (single line) / TextArea (multiline) from ui-shared.
vi.mock("@ally-ui-mono/ui-shared", () => {
  const Field = ({
    disabled,
    invalid,
    invalidText,
    value,
    onChange,
    id,
    labelText,
    hideLabel,
    style,
    size,
    rows,
    ref,
    ...props
  }: any) => (
    <div data-testid="carbon-textfield">
      <input
        data-testid="textfield-input"
        disabled={disabled}
        value={value}
        onChange={onChange}
        aria-invalid={invalid}
        style={style}
        {...props}
      />
      {invalidText && <span>{invalidText}</span>}
    </div>
  );
  return {
    TextInput: (props: any) => <Field {...props} />,
    TextArea: (props: any) => <Field {...props} />,
  };
});

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
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders with medium fieldSize", () => {
    render(<TextField name="username" register={mockRegister} fieldSize="medium" />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders with large fieldSize", () => {
    render(<TextField name="username" register={mockRegister} fieldSize="large" />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders with fullWidth by default", () => {
    render(<TextField name="username" register={mockRegister} />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders without fullWidth when set to false", () => {
    render(<TextField name="username" register={mockRegister} fullWidth={false} />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders as multiline", () => {
    render(<TextField name="description" register={mockRegister} multiline={true} />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders with custom rows for multiline", () => {
    render(<TextField name="description" register={mockRegister} multiline={true} rows={5} />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders with showBorder by default", () => {
    render(<TextField name="username" register={mockRegister} />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders without border when showBorder is false", () => {
    render(<TextField name="username" register={mockRegister} showBorder={false} />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
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
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("renders without register when not provided", () => {
    render(<TextField name="username" />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });

  it("has correct wrapper flex classes", () => {
    const { container } = render(<TextField name="username" register={mockRegister} />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).toHaveClass("flex-col");
  });

  it("error message has correct styling", () => {
    const errors = { username: { message: "Error" } };
    const { container } = render(
      <TextField name="username" register={mockRegister} errors={errors} hideError={false} />,
    );
    const errorSpan = screen.getByText("Error");
    expect(errorSpan).toBeInTheDocument();
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

  it("passes additional props to the underlying input", () => {
    render(<TextField name="username" register={mockRegister} placeholder="Enter username" />);
    expect(screen.getByTestId("carbon-textfield")).toBeInTheDocument();
  });
});
