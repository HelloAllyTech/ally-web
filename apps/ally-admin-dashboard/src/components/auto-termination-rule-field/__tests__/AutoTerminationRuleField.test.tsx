import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { vi, describe, it, expect } from "vitest";

import { AutoTerminationRuleField } from "../AutoTerminationRuleField";

// Mock assets
vi.mock("@assets", () => ({
  ArrowSolid: () => <svg data-testid="arrow-solid">Arrow</svg>,
  AccountTree: () => <svg data-testid="account-tree">AccountTree</svg>,
  AlarmOn: () => <svg data-testid="alarm-on">AlarmOn</svg>,
  BinaryClassification: () => <svg data-testid="binary-classification">BinaryClassification</svg>,
  Chat: () => <svg data-testid="chat">Chat</svg>,
  Close: () => <svg data-testid="close">Close</svg>,
  DiamondShine: () => <svg data-testid="diamond-shine">DiamondShine</svg>,
  FocusLens: () => <svg data-testid="focus-lens">FocusLens</svg>,
  Tick: () => <svg data-testid="tick">Tick</svg>,
  SemanticSimilarity: () => <svg data-testid="semantic-similarity">SemanticSimilarity</svg>,
}));

// Mock hooks
vi.mock("@hooks", () => ({
  useClickOutside: vi.fn(),
  useDebounce: vi.fn((callback, _delay) => {
    // Return the callback directly without debouncing for tests
    return callback;
  }),
}));

// Mock API
vi.mock("@api", () => ({
  useGetSessionEventsQuery: vi.fn(() => ({
    data: {
      data: [
        { id: "event-1", name: "Event 1" },
        { id: "event-2", name: "Event 2" },
      ],
    },
    isLoading: false,
    error: null,
  })),
}));

// Mock constants
vi.mock("@constants", () => ({
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
  FORM_FIELD_TYPES: {
    TEXT: "text",
    NUMBER: "number",
    SELECT: "select",
    IMAGE_UPLOAD: "image_upload",
    VIDEO_UPLOAD: "video_upload",
    CUSTOM: {
      VOICE_DROPDOWN: "voice_dropdown",
      AUTO_TERMINATION_RULE: "auto_termination_rule",
    },
  },
  en: {
    simulation: {
      autoTermination: "Auto termination",
      triggerEvent: "Trigger event",
      triggerEventPlaceholder: "Select an event",
      triggerMessage: "Termination message",
      terminationMessagePlaceholder:
        "Enter the message the agent will say before ending the session",
    },
    common: {
      enabled: "Enabled",
      disabled: "Disabled",
    },
  },
}));

// Wrapper component to provide form context
const TestWrapper = ({ children, defaultValues = {} }) => {
  const formMethods = useForm({ defaultValues });
  return <>{typeof children === "function" ? children(formMethods) : children}</>;
};

describe("AutoTerminationRuleField", () => {
  it("renders toggle switch with label", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    expect(screen.getByText("Auto termination")).toBeInTheDocument();
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("shows 'Enabled' when toggle is on", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("does not show trigger event and termination message fields when disabled", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    expect(screen.queryByText("Trigger event")).not.toBeInTheDocument();
    expect(screen.queryByText("Termination message")).not.toBeInTheDocument();
  });

  it("shows trigger event and termination message fields when enabled", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);

    expect(screen.getByText("Trigger event")).toBeInTheDocument();
    expect(screen.getByText("Termination message")).toBeInTheDocument();
  });

  it("shows required asterisk for trigger event", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);

    const triggerEventLabel = screen.getByText("Trigger event");
    const asterisk = triggerEventLabel.parentElement?.querySelector(".text-destructive-500");
    expect(asterisk).toBeInTheDocument();
  });

  it("shows required asterisk for termination message", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);

    const terminationMessageLabel = screen.getByText("Termination message");
    const asterisk = terminationMessageLabel.parentElement?.querySelector(".text-destructive-500");
    expect(asterisk).toBeInTheDocument();
  });

  it("displays character count for termination message", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);

    expect(screen.getByText("0/200")).toBeInTheDocument();
  });

  it("updates character count when typing in termination message", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);

    const textarea = screen.getByPlaceholderText(/Enter the message the agent will say/i);
    fireEvent.change(textarea, { target: { value: "Hello" } });

    expect(screen.getByText("5/200")).toBeInTheDocument();
  });

  it("has correct placeholder for trigger event dropdown", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);

    expect(screen.getByText("Select an event")).toBeInTheDocument();
  });

  it("has correct placeholder for termination message", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);

    expect(
      screen.getByPlaceholderText(
        /Enter the message the agent will say before ending the session/i,
      ),
    ).toBeInTheDocument();
  });

  it("enforces maxLength of 200 on termination message", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);

    const textarea = screen.getByPlaceholderText(/Enter the message the agent will say/i);
    expect(textarea).toHaveAttribute("maxLength", "200");
  });

  it("toggle button has correct styling when disabled", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    expect(toggle.className).toContain("bg-neutral-200");
  });

  it("toggle button has correct styling when enabled", () => {
    render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const toggle = screen.getByRole("button", { name: /toggle/i });
    fireEvent.click(toggle);
    expect(toggle.className).toContain("bg-success-200");
  });

  it("has correct gap between sections", () => {
    const { container } = render(
      <TestWrapper>
        {formMethods => (
          <AutoTerminationRuleField label="Auto termination" formMethods={formMethods} />
        )}
      </TestWrapper>,
    );
    const mainWrapper = container.querySelector(".flex.flex-col.gap-6");
    expect(mainWrapper).toBeInTheDocument();
  });
});
