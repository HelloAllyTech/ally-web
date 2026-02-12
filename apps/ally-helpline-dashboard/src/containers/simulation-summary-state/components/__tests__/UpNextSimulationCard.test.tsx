import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { UpNextSimulationCard } from "../UpNextSimulationCard";

// Define the types inline to avoid import issues
interface UpcomingScenario {
  id?: string;
  title?: string;
  description?: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  scenarioPathSessionItemStatus?: string;
  order?: number;
  scenarioPathSessionItemId?: string;
}

interface CurrentSession {
  scenarioId?: string;
  isScenarioPathSessionCompleted?: string;
  coverImageUrl?: string;
  title?: string;
  scenarioPathSessionItemId?: string;
  transitionMessageTitle?: string;
  transitionMessageContent?: string;
  scenarioPathSessionStatus?: boolean;
  scenarioPathSessionItemStatus?: string;
}

interface GetUpComingSimulationResponse {
  upcomingScenario?: UpcomingScenario;
  currentSession?: CurrentSession;
}

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useStartSimulation hook
const mockStartSimulation = vi.fn();
vi.mock("@hooks", () => ({
  useStartSimulation: () => ({
    startSimulation: mockStartSimulation,
    isStarting: false,
  }),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock Button component
vi.mock("@components", () => ({
  Button: ({ children, onClick, disabled, className, variant, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
  },
}));

// Mock constants
vi.mock("@constants", () => ({
  ROUTES: {
    LEARN: "/learn",
  },
}));

// Mock types
vi.mock("@types", () => ({
  PathwayScenarioStatus: {
    COMPLETED: "COMPLETED",
    IN_PROGRESS: "IN_PROGRESS",
    NOT_STARTED: "NOT_STARTED",
  },
}));

// Mock utils
vi.mock("@utils", () => ({
  isNonEmptyObject: (obj: any) => obj && typeof obj === "object" && Object.keys(obj).length > 0,
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("UpNextSimulationCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getMockData = (): GetUpComingSimulationResponse => ({
    upcomingScenario: {
      id: "sim-123",
      order: 2,
      title: "Hopeless Male, 40",
      description:
        "A 40-year-old male is experiencing deep hopelessness. He feels overwhelmed by ongoing personal and professional failures, believes his situation won't improve, and is withdrawing socially. He's showing signs of resignation and low self-worth. Your goal is to explore his thoughts gently, offer validation, and begin rebuilding his sense of agency and hope.",
      coverImageUrl: "https://via.placeholder.com/120",
      scenarioPathSessionItemId: "path-item-123",
    },
    currentSession: {
      scenarioId: "current-sim-123",
      isScenarioPathSessionCompleted: "", // Must be falsy to show Up Next card
      scenarioPathSessionItemStatus: "COMPLETED", // Must be COMPLETED to show "Great work!"
      transitionMessageTitle: "Great work!",
      transitionMessageContent: "You've completed the previous simulation.",
      title: "Current Simulation",
      coverImageUrl: "https://via.placeholder.com/100",
      scenarioPathSessionItemId: "current-path-item-123",
    },
  });

  describe("Basic Rendering", () => {
    it("should render the simulation card with all elements", () => {
      render(<UpNextSimulationCard data={getMockData()} />);

      expect(screen.getByText(/Simulation 2/)).toBeInTheDocument();
      expect(screen.getByText("Hopeless Male, 40")).toBeInTheDocument();
      expect(screen.getByText("Scenario:")).toBeInTheDocument();
      expect(
        screen.getByText(/A 40-year-old male is experiencing deep hopelessness/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Great work!/)).toBeInTheDocument();
      expect(screen.getByText("You've completed the previous simulation.")).toBeInTheDocument();
    });

    it("should render the cover image with correct attributes", () => {
      render(<UpNextSimulationCard data={getMockData()} />);

      const image = screen.getByAltText("Hopeless Male, 40");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://via.placeholder.com/120");
    });
  });

  describe("Props Handling", () => {
    it("should display correct simulation number", () => {
      const customData = getMockData();
      if (customData.upcomingScenario) {
        customData.upcomingScenario.order = 5;
      }
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText(/Simulation 5/)).toBeInTheDocument();
    });

    it("should display custom title", () => {
      const customData = getMockData();
      if (customData.upcomingScenario) {
        customData.upcomingScenario.title = "Custom Title";
      }
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("should display custom scenario text", () => {
      const customScenario = "This is a custom scenario description.";
      const customData = getMockData();
      if (customData.upcomingScenario) {
        customData.upcomingScenario.description = customScenario;
      }
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText(customScenario)).toBeInTheDocument();
    });

    it("should use custom cover image URL", () => {
      const customImageUrl = "https://example.com/custom-image.jpg";
      const customData = getMockData();
      if (customData.upcomingScenario) {
        customData.upcomingScenario.coverImageUrl = customImageUrl;
      }
      render(<UpNextSimulationCard data={customData} />);

      const image = screen.getByAltText(getMockData().upcomingScenario!.title!);
      expect(image).toHaveAttribute("src", customImageUrl);
    });
  });

  describe("Styling", () => {
    it("should have correct container classes", () => {
      const { container } = render(<UpNextSimulationCard data={getMockData()} />);

      const card = container.querySelector(".rounded-\\[8px\\]");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("rounded-[8px]", "border");
    });

    it("should have correct image dimensions", () => {
      render(<UpNextSimulationCard data={getMockData()} />);

      const image = screen.getByAltText(getMockData().upcomingScenario!.title!);
      expect(image).toHaveClass("w-[120px]", "h-[60px]", "rounded-[8px]", "object-cover");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty description text", () => {
      const customData = getMockData();
      if (customData.upcomingScenario) {
        customData.upcomingScenario.description = "";
      }
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText("Scenario:")).toBeInTheDocument();
    });

    it("should handle simulation number 0", () => {
      const customData = getMockData();
      if (customData.upcomingScenario) {
        customData.upcomingScenario.order = 0;
      }
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText(/Simulation 0/)).toBeInTheDocument();
    });

    it("should handle long description text", () => {
      const longDescription = "A".repeat(500);
      const customData = getMockData();
      if (customData.upcomingScenario) {
        customData.upcomingScenario.description = longDescription;
      }
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it("should handle special characters in title", () => {
      const specialTitle = "Test & Title <with> 'Special' \"Characters\"";
      const customData = getMockData();
      if (customData.upcomingScenario) {
        customData.upcomingScenario.title = specialTitle;
      }
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it("should return null when data is not provided", () => {
      const { container } = render(<UpNextSimulationCard data={null as any} />);

      expect(container.firstChild).toBeNull();
    });
  });
});
