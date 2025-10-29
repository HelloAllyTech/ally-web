import * as React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { Input } from "../Input";

describe("Input", () => {
  it("should match snapshot when rendered with a placeholder", () => {
    const { asFragment } = render(<Input placeholder="Test input" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("should render with default type", () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement).toBeInTheDocument();
  });

  it("should correctly apply a different input type (e.g., 'password')", () => {
    render(<Input type="password" data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement).toHaveAttribute("type", "password");
  });

  it("should merge custom className with the utility classes", () => {
    const customClass = "bg-blue-500";
    render(<Input className={customClass} data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement.className).toContain("rounded-md");
    expect(inputElement.className).toContain(customClass);
  });

  it("should render as disabled and include disabled styling classes", () => {
    render(<Input disabled data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement).toBeDisabled();
    expect(inputElement.className).toContain("disabled:cursor-not-allowed");
    expect(inputElement.className).toContain("disabled:opacity-50");
  });

  it("should correctly forward the ref to the native input element", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} data-testid="test-input" defaultValue="Ref Check" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.value).toBe("Ref Check");
  });

  it("should correctly render a placeholder attribute", () => {
    const placeholderText = "Required Field";
    render(<Input placeholder={placeholderText} data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement).toHaveAttribute("placeholder", placeholderText);
  });

  it("should have correct default width", () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement.className).toContain("w-[80px]");
  });

  it("should have correct height", () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement.className).toContain("h-10");
  });

  it("should have border styling", () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement.className).toContain("border");
  });

  it("should have focus-visible styling", () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement.className).toContain("focus-visible:outline-none");
    expect(inputElement.className).toContain("focus-visible:ring-2");
  });

  it("should handle empty className gracefully", () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement).toBeInTheDocument();
  });

  it("should apply text size classes", () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement.className).toContain("text-base");
  });

  it("should have placeholder styling", () => {
    render(<Input data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");
    expect(inputElement.className).toContain("placeholder:text-muted-foreground");
  });

  it("should have correct display name", () => {
    expect(Input.displayName).toBe("Input");
  });
});
