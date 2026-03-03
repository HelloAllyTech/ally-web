import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { StatusBadge } from "../StatusBadge";

// Stub @constants to avoid loading entire barrel and its transitive imports
vi.mock("@constants", () => ({
  userStatus: {
    ACTIVE: "ACTIVE",
    SUSPENDED: "SUSPENDED",
    INACTIVE: "INACTIVE",
    BLOCKED: "BLOCKED",
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SESSION_EVENT_TAGS: "sessionEventTags",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
    SIMULATION_PATHS: "simulationPaths",
    SCENARIO_PATHS: "scenarioPaths",
    EACH_SESSION: "eachSession",
    SIMULATION_CASES: "simulationCases",
    TRIGGER_WARNINGS: "triggerWarnings",
    SCENARIO_VOICES: "scenarioVoices",
    SCENARIO_LANGUAGES: "scenarioLanguages",
    SUMMARY_SECTIONS: "summarySections",
    UPDATE_SUMMARY_SECTIONS: "updateSummarySections",
    CHARACTERS: "characters",
    PROMPTS: "prompts",
    CONVERSATIONAL_GUARDRAILS: "conversationalGuardrails",
    USER_BADGES: "userBadges",
    HELPER_TAGS: "helperTags",
  },
}));

describe("StatusBadge", () => {
  it("renders ACTIVE status with correct text", () => {
    render(<StatusBadge status="ACTIVE" />);
    const text = screen.getByText("Active");
    expect(text).toBeInTheDocument();
  });

  it("falls back to ACTIVE styles for unknown status and formats text", () => {
    render(<StatusBadge status="UNKNOWN" />);
    const text = screen.getByText("Unknown");
    expect(text).toBeInTheDocument();
  });
});
