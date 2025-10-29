import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Minimal assets
vi.mock("@assets", () => ({
  Trash: () => <svg data-testid="trash" />,
}));

// Provide TAG_TYPES to avoid baseApi tagTypes import path via other modules
vi.mock("@constants", () => ({
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
}));

import { MoreOptionsPopup } from "../MoreOptionsPopup";

describe("MoreOptionsPopup", () => {
  it("renders null when closed", () => {
    const { container } = render(
      <MoreOptionsPopup
        isOpen={false}
        onClose={vi.fn()}
        onDiscardSimulation={vi.fn()}
        position={{ top: 10, right: 10 }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders and calls onDiscardSimulation when clicked", () => {
    const onDiscard = vi.fn();
    render(
      <MoreOptionsPopup
        isOpen={true}
        onClose={vi.fn()}
        onDiscardSimulation={onDiscard}
        position={{ top: 20, right: 30 }}
      />,
    );
    fireEvent.click(screen.getByText("Discard simulation"));
    expect(onDiscard).toHaveBeenCalled();
  });

  it("closes when clicking outside via useClickOutside", () => {
    const onClose = vi.fn();
    render(
      <MoreOptionsPopup
        isOpen={true}
        onClose={onClose}
        onDiscardSimulation={vi.fn()}
        position={{ top: 20, right: 30 }}
      />,
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });
});
