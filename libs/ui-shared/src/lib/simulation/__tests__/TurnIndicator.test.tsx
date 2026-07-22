import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";

import { TurnTakingIndicator, TurnState } from "../TurnIndicator";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe("TurnTakingIndicator", () => {
  it("renders the default message for a turn state", () => {
    render(<TurnTakingIndicator turnState={TurnState.AI_SPEAKING} />);
    expect(screen.getByRole("status")).toHaveTextContent("Speaking...");
  });

  it("renders nothing for the idle state", () => {
    const { container } = render(<TurnTakingIndicator turnState={TurnState.IDLE} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses smaller text/padding in compact mode without changing the message", () => {
    const { rerender } = render(<TurnTakingIndicator turnState={TurnState.USER_TURN_TO_LISTEN} />);
    const normal = screen.getByRole("status");
    expect(normal).toHaveTextContent("Your turn to listen");
    expect(normal.className).toContain("px-3");

    rerender(<TurnTakingIndicator turnState={TurnState.USER_TURN_TO_LISTEN} compact />);
    const compact = screen.getByRole("status");
    expect(compact).toHaveTextContent("Your turn to listen");
    expect(compact.className).toContain("px-1.5");
  });

  it("respects custom translations", () => {
    render(
      <TurnTakingIndicator
        turnState={TurnState.THINKING}
        translations={{
          speaking: "s",
          listening: "l",
          yourTurnToSpeak: "yts",
          yourTurnToListen: "ytl",
          thinking: "Pensando...",
          paused: "p",
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Pensando...");
  });
});
