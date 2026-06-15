import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { Button } from "../Button";

// Mock the utils
vi.mock("@utils", () => ({
  getButtonStyles: (variant: string) => {
    const styles = {
      primary: "bg-blue-600 text-white hover:bg-blue-700",
      secondary: "bg-gray-200 text-typography-800",
      destructive: "bg-red-600 text-white",
      text: "bg-transparent text-blue-600",
    };
    return styles[variant as keyof typeof styles] || styles.primary;
  },
}));

describe("Button", () => {
  it("renders with default props", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click events", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    render(<Button className="custom-class">Click me</Button>);
    const button = screen.getByText("Click me");
    expect(button.className).toContain("custom-class");
  });

  it("renders with different variants", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText("Primary")).toBeInTheDocument();

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByText("Secondary")).toBeInTheDocument();

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByText("Destructive")).toBeInTheDocument();
  });

  it("renders with fullWidth prop", () => {
    render(<Button fullWidth>Full Width Button</Button>);
    const button = screen.getByText("Full Width Button");
    expect(button.className).toContain("w-full");
  });

  it("can be disabled", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );

    const button = screen.getByText("Disabled");
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renders with text variant", () => {
    render(<Button variant="text">Text Button</Button>);
    expect(screen.getByText("Text Button")).toBeInTheDocument();
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Button with ref</Button>);
    expect(ref).toHaveBeenCalled();
  });

  it("renders children correctly", () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>,
    );
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("applies hover styles", () => {
    render(<Button>Hover me</Button>);
    const button = screen.getByText("Hover me");
    expect(button.className).toContain("hover:bg-blue-700");
  });

  it("has correct default height", () => {
    render(<Button>Button</Button>);
    const button = screen.getByText("Button");
    expect(button.className).toContain("h-10");
  });

  it("has correct padding", () => {
    render(<Button>Button</Button>);
    const button = screen.getByText("Button");
    expect(button.className).toContain("px-4");
    expect(button.className).toContain("py-2");
  });

  it("has square corners (Carbon)", () => {
    render(<Button>Button</Button>);
    const button = screen.getByText("Button");
    expect(button.className).toContain("rounded-none");
  });

  it("has transition effects", () => {
    render(<Button>Button</Button>);
    const button = screen.getByText("Button");
    expect(button.className).toContain("transition-colors");
  });

  it("applies disabled styles", () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText("Disabled Button");
    expect(button.className).toContain("disabled:cursor-not-allowed");
  });

  it("has disabled cursor style", () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText("Disabled Button");
    expect(button.className).toContain("disabled:cursor-not-allowed");
  });

  it("has disabled opacity", () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByText("Disabled Button");
    expect(button.className).toContain("disabled:opacity-50");
  });
});
