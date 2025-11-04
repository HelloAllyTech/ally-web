import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import Chip from "../Chip";
import { ChipProps } from "../types";

// Mock icon component
const MockIcon = vi.fn((props: any) => <svg data-testid="mock-icon" {...props} />);

describe("Chip", () => {
  const defaultConfig = {
    label: "Test Chip",
  };

  const defaultProps: ChipProps = {
    config: defaultConfig,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props: Partial<ChipProps> = {}) => {
    return render(<Chip {...defaultProps} {...props} />);
  };

  // --- Snapshot Tests ---

  it("should match snapshot when rendered with default config", () => {
    const { asFragment } = renderComponent();
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when rendered with icon", () => {
    const { asFragment } = renderComponent({
      config: { ...defaultConfig, icon: MockIcon },
    });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when rendered with custom className", () => {
    const { asFragment } = renderComponent({
      className: "custom-class",
    });
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should render the chip component", () => {
    renderComponent();
    const chip = screen.getByText("Test Chip");
    expect(chip).toBeInTheDocument();
  });

  it("should render the label text", () => {
    renderComponent({ config: { label: "Custom Label" } });
    expect(screen.getByText("Custom Label")).toBeInTheDocument();
  });

  it("should render icon when icon is provided in config", () => {
    renderComponent({
      config: {
        ...defaultConfig,
        icon: MockIcon,
      },
    });
    expect(screen.getByTestId("mock-icon")).toBeInTheDocument();
  });

  it("should render dot when icon is not provided", () => {
    const { container } = renderComponent();
    const dot = container.querySelector(".w-2.h-2.rounded-full");
    expect(dot).toBeInTheDocument();
  });

  it("should not render dot when icon is provided", () => {
    const { container } = renderComponent({
      config: {
        ...defaultConfig,
        icon: MockIcon,
      },
    });
    const dot = container.querySelector(".w-2.h-2.rounded-full");
    expect(dot).not.toBeInTheDocument();
  });

  it("should not render icon when icon is not provided", () => {
    renderComponent();
    expect(screen.queryByTestId("mock-icon")).not.toBeInTheDocument();
  });

  // --- ClassName Tests ---

  it("should apply custom className prop", () => {
    const { container } = renderComponent({ className: "custom-chip-class" });
    const chipDiv = container.firstChild as HTMLElement;
    expect(chipDiv).toHaveClass("custom-chip-class");
  });

  it("should apply outerDivClassName from config", () => {
    const { container } = renderComponent({
      config: {
        ...defaultConfig,
        outerDivClassName: "custom-outer-class",
      },
    });
    const chipDiv = container.firstChild as HTMLElement;
    expect(chipDiv).toHaveClass("custom-outer-class");
  });

  it("should merge custom className with outerDivClassName", () => {
    const { container } = renderComponent({
      className: "custom-prop-class",
      config: {
        ...defaultConfig,
        outerDivClassName: "custom-config-class",
      },
    });
    const chipDiv = container.firstChild as HTMLElement;
    expect(chipDiv).toHaveClass("custom-prop-class");
    expect(chipDiv).toHaveClass("custom-config-class");
  });

  it("should apply dotClassName to dot when provided", () => {
    const { container } = renderComponent({
      config: {
        ...defaultConfig,
        dotClassName: "custom-dot-class",
      },
    });
    const dot = container.querySelector(".w-2.h-2.rounded-full");
    expect(dot).toHaveClass("custom-dot-class");
  });

  // --- Base Classes Tests ---

  it("should have base classes on chip container", () => {
    const { container } = renderComponent();
    const chipDiv = container.firstChild as HTMLElement;
    expect(chipDiv).toHaveClass(
      "inline-flex",
      "items-center",
      "gap-2",
      "px-2",
      "rounded-full",
      "text-sm",
      "font-medium",
      "transition-colors",
      "duration-200",
    );
  });

  it("should have whitespace-nowrap on label span", () => {
    const { container } = renderComponent();
    const label = container.querySelector("span");
    expect(label).toHaveClass("whitespace-nowrap");
  });

  it("should have base classes on dot", () => {
    const { container } = renderComponent();
    const dot = container.querySelector(".w-2.h-2.rounded-full");
    expect(dot).toHaveClass("flex-shrink-0");
  });

  // --- Edge Cases ---

  it("should render with multiple words in label", () => {
    renderComponent({ config: { label: "Multiple Words Label" } });
    expect(screen.getByText("Multiple Words Label")).toBeInTheDocument();
  });

  it("should handle empty className prop", () => {
    const { container } = renderComponent({ className: "" });
    const chipDiv = container.firstChild as HTMLElement;
    // Should still have base classes
    expect(chipDiv).toHaveClass("inline-flex");
  });

  it("should handle empty outerDivClassName in config", () => {
    const { container } = renderComponent({
      config: {
        ...defaultConfig,
        outerDivClassName: "",
      },
    });
    const chipDiv = container.firstChild as HTMLElement;
    // Should still have base classes
    expect(chipDiv).toHaveClass("inline-flex");
  });

  it("should handle empty dotClassName in config", () => {
    const { container } = renderComponent({
      config: {
        ...defaultConfig,
        dotClassName: "",
      },
    });
    const dot = container.querySelector(".w-2.h-2.rounded-full");
    // Should still have base classes
    expect(dot).toHaveClass("flex-shrink-0");
  });

  it("should apply hidden class to dot when dotClassName is 'hidden'", () => {
    const { container } = renderComponent({
      config: {
        ...defaultConfig,
        dotClassName: "hidden",
      },
    });
    const dot = container.querySelector(".w-2.h-2.rounded-full");
    expect(dot).toHaveClass("hidden");
  });

  it("should render icon with correct props", () => {
    renderComponent({
      config: {
        ...defaultConfig,
        icon: MockIcon,
      },
    });
    expect(MockIcon).toHaveBeenCalled();
  });
});
