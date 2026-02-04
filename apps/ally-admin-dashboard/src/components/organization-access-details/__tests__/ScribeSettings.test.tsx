import { render, screen, fireEvent, within } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { ScribeSettings } from "../ScribeSettings";

// Mock the components
vi.mock("@components", () => ({
  ToggleSwitch: ({ enabled, onChange, label }: any) => (
    <button
      onClick={() => onChange(!enabled)}
      aria-label={label}
      data-testid={`toggle-${label}`}
      data-enabled={enabled}
    >
      {label}
    </button>
  ),
  Accordion: ({ title, children, headerActions }: any) => (
    <div data-testid={`accordion-${title}`}>
      <div data-testid={`accordion-header-${title}`}>{headerActions}</div>
      <div data-testid={`accordion-content-${title}`}>{children}</div>
    </div>
  ),
}));

// Mock assets
vi.mock("@assets", () => ({
  ArrowSolid: () => <svg data-testid="arrow-solid" />,
}));

// Mock constants
vi.mock("@constants", () => ({
  en: {
    userManagement: {
      enabled: "Enabled",
      disabled: "Disabled",
      additionalFields: "Additional Fields",
    },
  },
}));

describe("ScribeSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the component with title", () => {
    render(<ScribeSettings />);
    expect(screen.getByText("Additional Fields")).toBeInTheDocument();
  });

  it("renders all parent accordions", () => {
    render(<ScribeSettings />);
    expect(screen.getByTestId("accordion-Intake")).toBeInTheDocument();
    expect(screen.getByTestId("accordion-Ongoing Risks")).toBeInTheDocument();
  });

  it("renders child items within accordions", () => {
    render(<ScribeSettings />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");
    const ongoingRisksContent = screen.getByTestId("accordion-content-Ongoing Risks");

    expect(within(intakeContent).getByTestId("toggle-Intake Notes")).toBeInTheDocument();
    expect(within(intakeContent).getByTestId("toggle-Risk, Self Harm")).toBeInTheDocument();
    expect(within(intakeContent).getByTestId("toggle-Risk, Self Harm Notes")).toBeInTheDocument();
    expect(
      within(ongoingRisksContent).getByTestId("toggle-Risk, Self Harm Notes"),
    ).toBeInTheDocument();
  });

  it("displays enabled/disabled status for child items", () => {
    render(<ScribeSettings />);
    const intakeNotesToggle = screen.getByTestId("toggle-Intake Notes");
    expect(intakeNotesToggle).toHaveAttribute("data-enabled", "true");

    const riskSelfHarmToggle = screen.getByTestId("toggle-Risk, Self Harm");
    expect(riskSelfHarmToggle).toHaveAttribute("data-enabled", "false");
  });

  it("displays enabled/disabled status for parent items", () => {
    render(<ScribeSettings />);
    const intakeToggle = screen.getByTestId("toggle-Intake");
    expect(intakeToggle).toHaveAttribute("data-enabled", "true");

    const ongoingRisksToggle = screen.getByTestId("toggle-Ongoing Risks");
    expect(ongoingRisksToggle).toHaveAttribute("data-enabled", "false");
  });

  it("toggles child item when clicked", () => {
    render(<ScribeSettings />);
    const riskSelfHarmToggle = screen.getByTestId("toggle-Risk, Self Harm");
    expect(riskSelfHarmToggle).toHaveAttribute("data-enabled", "false");

    fireEvent.click(riskSelfHarmToggle);
    expect(riskSelfHarmToggle).toHaveAttribute("data-enabled", "true");
  });

  it("toggles parent item when clicked and updates all children", () => {
    render(<ScribeSettings />);
    const intakeToggle = screen.getByTestId("toggle-Intake");
    const intakeNotesToggle = screen.getByTestId("toggle-Intake Notes");

    // Initially enabled
    expect(intakeToggle).toHaveAttribute("data-enabled", "true");
    expect(intakeNotesToggle).toHaveAttribute("data-enabled", "true");

    // Toggle parent off
    fireEvent.click(intakeToggle);

    // Parent should be disabled
    expect(intakeToggle).toHaveAttribute("data-enabled", "false");
    // All children should be disabled
    expect(intakeNotesToggle).toHaveAttribute("data-enabled", "false");
  });

  it("disables parent when all children are disabled", () => {
    render(<ScribeSettings />);
    const intakeToggle = screen.getByTestId("toggle-Intake");
    const intakeNotesToggle = screen.getByTestId("toggle-Intake Notes");

    // Disable the only enabled child
    fireEvent.click(intakeNotesToggle);

    // Parent should be disabled
    expect(intakeToggle).toHaveAttribute("data-enabled", "false");
  });

  it("does not enable parent when any child is enabled", () => {
    render(<ScribeSettings />);
    const ongoingRisksToggle = screen.getByTestId("toggle-Ongoing Risks");
    const ongoingRisksContent = screen.getByTestId("accordion-content-Ongoing Risks");
    const riskSelfHarmNotesToggle = within(ongoingRisksContent).getByTestId(
      "toggle-Risk, Self Harm Notes",
    );

    // Initially both are disabled
    expect(ongoingRisksToggle).toHaveAttribute("data-enabled", "false");
    expect(riskSelfHarmNotesToggle).toHaveAttribute("data-enabled", "false");

    // Enable a child
    fireEvent.click(riskSelfHarmNotesToggle);

    // Child should be enabled
    expect(riskSelfHarmNotesToggle).toHaveAttribute("data-enabled", "true");
    // Parent should remain disabled (not auto-enabled)
    expect(ongoingRisksToggle).toHaveAttribute("data-enabled", "false");
  });

  it("keeps parent enabled when some children are enabled", () => {
    render(<ScribeSettings />);
    const intakeToggle = screen.getByTestId("toggle-Intake");
    const riskSelfHarmToggle = screen.getByTestId("toggle-Risk, Self Harm");

    // Enable a disabled child
    fireEvent.click(riskSelfHarmToggle);

    // Parent should remain enabled
    expect(intakeToggle).toHaveAttribute("data-enabled", "true");
  });

  it("disables parent toggle when no children are enabled", () => {
    render(<ScribeSettings />);
    const ongoingRisksHeader = screen.getByTestId("accordion-header-Ongoing Risks");
    const disabledWrapper = ongoingRisksHeader.querySelector(".cursor-not-allowed");

    // Should have disabled styling when no children are enabled
    expect(disabledWrapper).toBeInTheDocument();
  });

  it("enables parent toggle when at least one child is enabled", () => {
    render(<ScribeSettings />);
    const intakeHeader = screen.getByTestId("accordion-header-Intake");
    const disabledWrapper = intakeHeader.querySelector(".cursor-not-allowed");

    // Should not have disabled styling when children are enabled
    expect(disabledWrapper).not.toBeInTheDocument();
  });

  it("renders all child items for each parent", () => {
    render(<ScribeSettings />);
    const intakeContent = screen.getByTestId("accordion-content-Intake");

    expect(intakeContent).toHaveTextContent("Intake Notes");
    expect(intakeContent).toHaveTextContent("Risk, Self Harm");
    expect(intakeContent).toHaveTextContent("Risk, Self Harm Notes");
  });

  it("displays correct enabled/disabled text for child items", () => {
    render(<ScribeSettings />);
    // Intake parent (enabled) + Intake Notes child (enabled) = 2
    expect(screen.getAllByText("Enabled")).toHaveLength(2);
    // Ongoing Risks parent (disabled) + 3 disabled children = 4
    // (Risk Self Harm, Risk Self Harm Notes in Intake, Risk Self Harm Notes in Ongoing Risks)
    expect(screen.getAllByText("Disabled")).toHaveLength(4);
  });

  it("updates enabled/disabled text when child is toggled", () => {
    render(<ScribeSettings />);
    const riskSelfHarmToggle = screen.getByTestId("toggle-Risk, Self Harm");

    // Initially disabled
    expect(screen.getAllByText("Disabled").length).toBeGreaterThan(0);

    // Toggle to enabled
    fireEvent.click(riskSelfHarmToggle);

    // Should now show more enabled items
    expect(screen.getAllByText("Enabled").length).toBeGreaterThan(1);
  });
});
