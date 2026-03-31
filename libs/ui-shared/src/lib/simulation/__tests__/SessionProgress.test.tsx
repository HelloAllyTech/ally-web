import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SessionProgress } from "../SessionProgress";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, style, className, ...props }: any) => (
      <div style={style} className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

const mockStateInstructions = [
  { name: "Resistive", stateId: "1" },
  { name: "Hopeless", stateId: "2" },
  { name: "Open", stateId: "3" },
  { name: "Hopeful", stateId: "4" },
];

describe("SessionProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render with correct test id", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
        />,
      );
      expect(screen.getByTestId("session-progress")).toBeInTheDocument();
    });

    it("should render the title", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
        />,
      );
      expect(screen.getByTestId("session-progress-title")).toHaveTextContent("Session Progress");
    });

    it("should render all state names", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
        />,
      );
      expect(screen.getByText("Resistive")).toBeInTheDocument();
      expect(screen.getByText("Hopeless")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("Hopeful")).toBeInTheDocument();
    });

    it("should render state test ids for each state", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
        />,
      );
      expect(screen.getByTestId("session-progress-state-1")).toBeInTheDocument();
      expect(screen.getByTestId("session-progress-state-2")).toBeInTheDocument();
      expect(screen.getByTestId("session-progress-state-3")).toBeInTheDocument();
      expect(screen.getByTestId("session-progress-state-4")).toBeInTheDocument();
    });

    it("should render progress bar", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
        />,
      );
      expect(screen.getByTestId("session-progress-bar")).toBeInTheDocument();
    });
  });

  describe("timer", () => {
    it("should render timer when startTime and maxTimeSeconds are provided", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
          startTime={new Date().toISOString()}
          maxTimeSeconds={600}
        />,
      );
      expect(screen.getByTestId("session-progress-timer")).toBeInTheDocument();
    });

    it("should not render timer when startTime is missing", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
          maxTimeSeconds={600}
        />,
      );
      expect(screen.queryByTestId("session-progress-timer")).not.toBeInTheDocument();
    });

    it("should not render timer when maxTimeSeconds is missing", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
          startTime={new Date().toISOString()}
        />,
      );
      expect(screen.queryByTestId("session-progress-timer")).not.toBeInTheDocument();
    });

    it("should display formatted max time", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
          startTime={new Date().toISOString()}
          maxTimeSeconds={5400}
        />,
      );
      expect(screen.getByTestId("session-progress-timer")).toHaveTextContent("90:00");
    });
  });

  describe("state highlighting", () => {
    it("should highlight state 2 for EASY difficulty with score 0", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={0}
        />,
      );
      const state2 = screen.getByText("Hopeless");
      expect(state2).toHaveStyle({ fontWeight: 700 });
    });

    it("should highlight state 1 for EASY difficulty with score -100", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={-100}
        />,
      );
      const state1 = screen.getByText("Resistive");
      expect(state1).toHaveStyle({ fontWeight: 700 });
    });

    it("should highlight state 4 for EASY difficulty with score 100", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="EASY"
          score={100}
        />,
      );
      const state4 = screen.getByText("Hopeful");
      expect(state4).toHaveStyle({ fontWeight: 700 });
    });

    it("should highlight state 3 for MEDIUM difficulty with score 75", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="MEDIUM"
          score={75}
        />,
      );
      const state3 = screen.getByText("Open");
      expect(state3).toHaveStyle({ fontWeight: 700 });
    });

    it("should highlight state 2 for HARD difficulty with score 50", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="HARD"
          score={50}
        />,
      );
      const state2 = screen.getByText("Hopeless");
      expect(state2).toHaveStyle({ fontWeight: 700 });
    });
  });

  describe("edge cases", () => {
    it("should render with 2 states", () => {
      const twoStates = [
        { name: "Bad", stateId: "1" },
        { name: "Good", stateId: "2" },
      ];
      render(
        <SessionProgress
          stateInstructions={twoStates}
          difficultyLevel="EASY"
          score={0}
        />,
      );
      expect(screen.getByText("Bad")).toBeInTheDocument();
      expect(screen.getByText("Good")).toBeInTheDocument();
    });

    it("should handle unknown difficulty by defaulting to state 0", () => {
      render(
        <SessionProgress
          stateInstructions={mockStateInstructions}
          difficultyLevel="UNKNOWN"
          score={50}
        />,
      );
      const state1 = screen.getByText("Resistive");
      expect(state1).toHaveStyle({ fontWeight: 700 });
    });
  });
});
