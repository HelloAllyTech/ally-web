import * as React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import Input from "../Input";

vi.mock("@utils", () => ({
  cn: (...inputs: (string | undefined | null)[]) => inputs.filter(Boolean).join(" "),
}));

// --- Unit Tests ---
describe("Input", () => {
  // --- Snapshot Test ---
  it("should match snapshot when rendered with a placeholder", () => {
    const { asFragment } = render(<Input placeholder="Test input" />);
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Behavioral Tests ---

  it("should correctly apply a different input type (e.g., 'password')", () => {
    render(<Input type="password" data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");

    expect(inputElement).toHaveAttribute("type", "password");
  });

  it("should merge custom className with the utility classes", () => {
    const customClass = "bg-blue-500 hover:shadow-lg";
    render(<Input className={customClass} data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");

    // Check for a base class
    expect(inputElement).toHaveClass("rounded-md");
    // Check for the custom class
    expect(inputElement).toHaveClass(customClass);
  });

  it("should render as disabled and include disabled styling classes", () => {
    render(<Input disabled data-testid="test-input" />);
    const inputElement = screen.getByTestId("test-input");

    expect(inputElement).toBeDisabled();
    // Check for specific disabled styling classes
    expect(inputElement).toHaveClass("disabled:cursor-not-allowed");
    expect(inputElement).toHaveClass("disabled:opacity-50");
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
});
