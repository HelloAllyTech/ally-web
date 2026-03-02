import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock constants early to avoid importing real module that pulls in SimulationCreator
vi.mock("@constants", () => ({
  ReportGenerationStatus: {
    STARTED: "STARTED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    FAILED: "FAILED",
  },
  en: {
    simulation: {
      back: "Back",
      next: "Next",
      publish: "Publish",
    },
  },
  TAG_TYPES: {
    USERS: "users",
    TENANTS: "tenants",
    SESSION_EVENTS: "sessionEvents",
    SIMULATION: "simulation",
    SIMULATION_EVENTS: "simulationEvents",
  },
}));

import { Footer } from "../Footer";

// Use real Button to avoid affecting other modules

// Using mocked constants above

describe("Footer", () => {
  it("renders nothing when both buttons hidden", () => {
    const { container } = render(
      <Footer onPrevious={vi.fn()} onNext={vi.fn()} showPrevious={false} showNext={false} />,
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders previous button and triggers callback", () => {
    const onPrev = vi.fn();
    render(<Footer onPrevious={onPrev} onNext={vi.fn()} showPrevious={true} showNext={false} />);

    fireEvent.click(screen.getByText("Back"));
    expect(onPrev).toHaveBeenCalled();
  });

  it("renders next button when not last step and triggers callback", () => {
    const onNext = vi.fn();
    render(<Footer onPrevious={vi.fn()} onNext={onNext} showPrevious={false} showNext={true} />);

    const nextBtn = screen.getByText("Next");
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalled();
  });

  it("hides next button on last step", () => {
    render(
      <Footer
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        showPrevious={false}
        showNext={true}
        isLastStep={true}
      />,
    );

    expect(screen.queryByText("Next")).toBeNull();
  });

  it("disables next button when isNextDisabled", () => {
    render(
      <Footer
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        showPrevious={false}
        showNext={true}
        isNextDisabled={true}
      />,
    );

    const nextBtn = screen.getByText("Next");
    expect(nextBtn).toBeDisabled();
  });
});
