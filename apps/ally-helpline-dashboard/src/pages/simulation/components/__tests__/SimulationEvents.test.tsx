import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import SimulationEvents from "../SimulationEvents";

// Mock utils used in the component
vi.mock("@utils", () => ({
  getElapsedTimeInMinutes: vi.fn(() => 0),
  getKeyFromIndex: (index: number, prefix: string) => `${prefix}-${index}`,
}));

describe("SimulationEvents", () => {
  it("renders correctly with no events (snapshot)", () => {
    const { container } = render(<SimulationEvents events={[]} />);
    expect(container).toMatchSnapshot();
  });

  it("renders correctly with events (snapshot)", () => {
    const mockEvents = [
      {
        emoji: "🎤",
        message: "User started speaking",
        timestamp: new Date().toISOString(),
        score: 5,
      },
      { emoji: "⏹️", message: "User stopped", timestamp: new Date().toISOString(), score: -5 },
    ];

    const { container } = render(<SimulationEvents events={mockEvents} />);
    expect(container).toMatchSnapshot();
  });
});
