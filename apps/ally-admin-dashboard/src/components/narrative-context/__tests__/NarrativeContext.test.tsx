import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock constants to avoid importing SimulationCreator
vi.mock("@constants", () => ({
  en: {
    simulation: {
      keyLifeEvents: "Key life events",
      keyLifeEventsPlaceholder: "Add key life events",
      familyBackground: "Family background",
      familyBackgroundPlaceholder: "Add family background",
    },
  },
  minInputHeight: { narrativeContext: "250" },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
}));

// Stub InputField to surface props in DOM for assertions
vi.mock("@components", () => ({
  InputField: ({ label, placeholder, minHeight, id }: any) => (
    <div data-testid={`input-${id}`}>
      <span>{label}</span>
      <span>{placeholder}</span>
      <span>min:{minHeight}</span>
    </div>
  ),
}));

import { NarrativeContext } from "../NarrativeContext";

describe("NarrativeContext", () => {
  const formMethods = {
    register: vi.fn(),
    setValue: vi.fn(),
    watch: vi.fn(),
    formState: { errors: {} },
  } as any;

  it("renders two InputFields with correct labels and placeholders", () => {
    render(<NarrativeContext formMethods={formMethods} />);

    expect(screen.getByTestId("input-keyLifeEvents")).toHaveTextContent("Key life events");
    expect(screen.getByTestId("input-keyLifeEvents")).toHaveTextContent("Add key life events");
    expect(screen.getByTestId("input-keyLifeEvents")).toHaveTextContent("min:250");

    expect(screen.getByTestId("input-familyBackground")).toHaveTextContent("Family background");
    expect(screen.getByTestId("input-familyBackground")).toHaveTextContent("Add family background");
    expect(screen.getByTestId("input-familyBackground")).toHaveTextContent("min:250");
  });
});
