import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { TurnTakingIndicator, TurnState } from "../TurnTakingIndicator";

describe("TurnTakingIndicator", () => {
  it("renders 'Speaking...' when AI is speaking", () => {
    render(<TurnTakingIndicator turnState={TurnState.AI_SPEAKING} />);
    expect(screen.getByText("Speaking...")).toBeInTheDocument();
  });

  it("renders 'Listening...' when AI is listening", () => {
    render(<TurnTakingIndicator turnState={TurnState.AI_LISTENING} />);
    expect(screen.getByText("Listening...")).toBeInTheDocument();
  });

  it("renders 'Your turn to speak' when it's user's turn to speak", () => {
    render(<TurnTakingIndicator turnState={TurnState.USER_TURN_TO_SPEAK} />);
    expect(screen.getByText("Your turn to speak")).toBeInTheDocument();
  });

  it("renders 'Your turn to listen' when it's user's turn to listen", () => {
    render(<TurnTakingIndicator turnState={TurnState.USER_TURN_TO_LISTEN} />);
    expect(screen.getByText("Your turn to listen")).toBeInTheDocument();
  });

  it("renders 'Thinking...' when AI is thinking", () => {
    render(<TurnTakingIndicator turnState={TurnState.THINKING} />);
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("renders nothing when state is IDLE", () => {
    const { container } = render(<TurnTakingIndicator turnState={TurnState.IDLE} />);
    expect(container.firstChild).toBeNull();
  });

  it("has proper accessibility attributes", () => {
    render(<TurnTakingIndicator turnState={TurnState.AI_SPEAKING} />);
    const indicator = screen.getByRole("status");
    expect(indicator).toHaveAttribute("aria-live", "polite");
    expect(indicator).toHaveAttribute("aria-atomic", "true");
  });

  it("applies correct background color for AI speaking", () => {
    render(<TurnTakingIndicator turnState={TurnState.AI_SPEAKING} />);
    const indicator = screen.getByRole("status");
    expect(indicator.className).toContain("bg-blue-600");
  });

  it("applies correct background color for user's turn to speak", () => {
    render(<TurnTakingIndicator turnState={TurnState.USER_TURN_TO_SPEAK} />);
    const indicator = screen.getByRole("status");
    expect(indicator.className).toContain("bg-blue-500");
  });
});
