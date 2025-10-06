import { render } from "@testing-library/react";
import { expect, vi, describe, it } from "vitest";

import SimulationControls from "../SimulationControls";

describe("SimulationControls Component", () => {
  const defaultProps = {
    isMuted: false,
    isEndingSession: false,
    onEndSessionClick: vi.fn(),
    onMuteClick: vi.fn(),
  };

  it("renders correctly when unmuted and not ending session", () => {
    const { asFragment } = render(<SimulationControls {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders correctly when muted", () => {
    const { asFragment } = render(<SimulationControls {...defaultProps} isMuted={true} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders correctly when ending session", () => {
    const { asFragment } = render(<SimulationControls {...defaultProps} isEndingSession={true} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
