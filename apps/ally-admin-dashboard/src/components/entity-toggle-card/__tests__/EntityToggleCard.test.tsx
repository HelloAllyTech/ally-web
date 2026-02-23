import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { EntityToggleCard } from "../EntityToggleCard";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  CustomImage: ({ src, alt, className }: { src: string; alt: string; className: string }) => (
    <img src={src} alt={alt} className={className} data-testid="custom-image" />
  ),
}));

vi.mock("@components", () => ({
  ToggleSwitch: ({
    enabled,
    onChange,
    label,
  }: {
    enabled: boolean;
    onChange: (val: boolean) => void;
    label: string;
  }) => (
    <button
      data-testid="toggle-switch"
      aria-label={label}
      onClick={() => onChange(!enabled)}
      data-enabled={enabled}
    >
      Toggle
    </button>
  ),
}));

vi.mock("@constants", () => ({
  en: {
    userManagement: {
      toggleAccess: (title: string) => `Toggle access for ${title}`,
      enabled: "Enabled",
      disabled: "Disabled",
    },
  },
}));

describe("EntityToggleCard", () => {
  const mockEntity = {
    imageUrl: "https://example.com/image.jpg",
    name: "Test Entity",
    description: "This is a test entity description",
  };

  const defaultProps = {
    entity: mockEntity,
    hasAccess: false,
    onToggleAccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders entity name", () => {
    render(<EntityToggleCard {...defaultProps} />);

    expect(screen.getByText("Test Entity")).toBeInTheDocument();
  });

  it("renders entity description", () => {
    render(<EntityToggleCard {...defaultProps} />);

    expect(screen.getByText("This is a test entity description")).toBeInTheDocument();
  });

  it("renders entity image with correct src and alt", () => {
    render(<EntityToggleCard {...defaultProps} />);

    const image = screen.getByTestId("custom-image");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
    expect(image).toHaveAttribute("alt", "Test Entity");
  });

  it("renders toggle switch", () => {
    render(<EntityToggleCard {...defaultProps} />);

    expect(screen.getByTestId("toggle-switch")).toBeInTheDocument();
  });

  it("renders 'Disabled' status when hasAccess is false", () => {
    render(<EntityToggleCard {...defaultProps} hasAccess={false} />);

    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("renders 'Enabled' status when hasAccess is true", () => {
    render(<EntityToggleCard {...defaultProps} hasAccess={true} />);

    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("calls onToggleAccess when toggle is clicked", () => {
    const onToggleAccess = vi.fn();
    render(<EntityToggleCard {...defaultProps} onToggleAccess={onToggleAccess} />);

    const toggle = screen.getByTestId("toggle-switch");
    fireEvent.click(toggle);

    expect(onToggleAccess).toHaveBeenCalledTimes(1);
  });

  it("passes correct enabled state to toggle switch when hasAccess is false", () => {
    render(<EntityToggleCard {...defaultProps} hasAccess={false} />);

    const toggle = screen.getByTestId("toggle-switch");
    expect(toggle).toHaveAttribute("data-enabled", "false");
  });

  it("passes correct enabled state to toggle switch when hasAccess is true", () => {
    render(<EntityToggleCard {...defaultProps} hasAccess={true} />);

    const toggle = screen.getByTestId("toggle-switch");
    expect(toggle).toHaveAttribute("data-enabled", "true");
  });

  it("passes correct label to toggle switch", () => {
    render(<EntityToggleCard {...defaultProps} />);

    const toggle = screen.getByTestId("toggle-switch");
    expect(toggle).toHaveAttribute("aria-label", "Toggle access for Test Entity");
  });

  it("applies correct text color when hasAccess is true", () => {
    render(<EntityToggleCard {...defaultProps} hasAccess={true} />);

    const enabledText = screen.getByText("Enabled");
    expect(enabledText).toHaveClass("text-typography-900");
  });

  it("applies correct text color when hasAccess is false", () => {
    render(<EntityToggleCard {...defaultProps} hasAccess={false} />);

    const disabledText = screen.getByText("Disabled");
    expect(disabledText).toHaveClass("text-typography-600");
  });

  it("renders with long entity name (truncated)", () => {
    const longNameEntity = {
      ...mockEntity,
      name: "This is a very long entity name that should be truncated",
    };
    render(<EntityToggleCard {...defaultProps} entity={longNameEntity} />);

    const nameElement = screen.getByText(
      "This is a very long entity name that should be truncated",
    );
    expect(nameElement).toHaveClass("truncate");
  });

  it("renders with long description (line-clamped)", () => {
    const longDescEntity = {
      ...mockEntity,
      description:
        "This is a very long description that should be clamped to two lines because it exceeds the available space in the component layout",
    };
    render(<EntityToggleCard {...defaultProps} entity={longDescEntity} />);

    const descElement = screen.getByText(longDescEntity.description);
    expect(descElement).toHaveClass("line-clamp-2");
  });

  it("has hover transition styles", () => {
    const { container } = render(<EntityToggleCard {...defaultProps} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("hover:bg-background-secondary");
    expect(card).toHaveClass("transition-colors");
  });

  it("has correct fixed height", () => {
    const { container } = render(<EntityToggleCard {...defaultProps} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("h-[80px]");
  });

  it("has border bottom styling", () => {
    const { container } = render(<EntityToggleCard {...defaultProps} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("border-b");
    expect(card).toHaveClass("border-border-light");
  });
});
