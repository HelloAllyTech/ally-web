import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { UpNextSimulationCard } from "../UpNextSimulationCard";
import { GetUpComingSimulationResponse } from "@types";

describe("UpNextSimulationCard", () => {
  const mockData: GetUpComingSimulationResponse = {
    id: "sim-123",
    order: 2,
    title: "Hopeless Male, 40",
    description: "Test description",
    transitionMessageTitle: "Great work!",
    transitionMessageContent: "You've completed the previous simulation.",
    scenario:
      "A 40-year-old male is experiencing deep hopelessness. He feels overwhelmed by ongoing personal and professional failures, believes his situation won't improve, and is withdrawing socially. He's showing signs of resignation and low self-worth. Your goal is to explore his thoughts gently, offer validation, and begin rebuilding his sense of agency and hope.",
    coverImageUrl: "https://via.placeholder.com/120",
  };

  describe("Basic Rendering", () => {
    it("should render the simulation card with all elements", () => {
      render(<UpNextSimulationCard data={mockData} />);

      expect(screen.getByText("Up next - Simulation 2")).toBeInTheDocument();
      expect(screen.getByText("Hopeless Male, 40")).toBeInTheDocument();
      expect(screen.getByText("Scenario:")).toBeInTheDocument();
      expect(
        screen.getByText(/A 40-year-old male is experiencing deep hopelessness/),
      ).toBeInTheDocument();
      expect(screen.getByText("Great work!")).toBeInTheDocument();
      expect(screen.getByText("You've completed the previous simulation.")).toBeInTheDocument();
    });

    it("should render the cover image with correct attributes", () => {
      render(<UpNextSimulationCard data={mockData} />);

      const image = screen.getByAltText("Hopeless Male, 40");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://via.placeholder.com/120");
    });
  });

  describe("Props Handling", () => {
    it("should display correct simulation number", () => {
      const customData = { ...mockData, order: 5 };
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText("Up next - Simulation 5")).toBeInTheDocument();
    });

    it("should display custom title", () => {
      const customData = { ...mockData, title: "Custom Title" };
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("should display custom scenario text", () => {
      const customScenario = "This is a custom scenario description.";
      const customData = { ...mockData, scenario: customScenario };
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText(customScenario)).toBeInTheDocument();
    });

    it("should use custom cover image URL", () => {
      const customImageUrl = "https://example.com/custom-image.jpg";
      const customData = { ...mockData, coverImageUrl: customImageUrl };
      render(<UpNextSimulationCard data={customData} />);

      const image = screen.getByAltText(mockData.title);
      expect(image).toHaveAttribute("src", customImageUrl);
    });
  });

  describe("Styling", () => {
    it("should have correct container classes", () => {
      const { container } = render(<UpNextSimulationCard data={mockData} />);

      const card = container.querySelector(".rounded-\\[8px\\]");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("rounded-[8px]", "border");
    });

    it("should have correct image dimensions", () => {
      render(<UpNextSimulationCard data={mockData} />);

      const image = screen.getByAltText(mockData.title);
      expect(image).toHaveClass("w-[120px]", "h-[60px]", "rounded-[8px]", "object-cover");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty scenario text", () => {
      const customData = { ...mockData, scenario: "" };
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText("Scenario:")).toBeInTheDocument();
      // Should fall back to description when scenario is empty
      expect(screen.getByText("Test description")).toBeInTheDocument();
    });

    it("should handle simulation number 0", () => {
      const customData = { ...mockData, order: 0 };
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText("Up next - Simulation 0")).toBeInTheDocument();
    });

    it("should handle long scenario text", () => {
      const longScenario = "A".repeat(500);
      const customData = { ...mockData, scenario: longScenario };
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText(longScenario)).toBeInTheDocument();
    });

    it("should handle special characters in title", () => {
      const specialTitle = "Test & Title <with> 'Special' \"Characters\"";
      const customData = { ...mockData, title: specialTitle };
      render(<UpNextSimulationCard data={customData} />);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it("should return null when data is not provided", () => {
      const { container } = render(<UpNextSimulationCard data={null as any} />);

      expect(container.firstChild).toBeNull();
    });
  });
});
