import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { UpNextSimulationCard } from "../UpNextSimulationCard";
import { UpNextSimulationCardProps } from "../types";

describe("UpNextSimulationCard", () => {
  const mockProps: UpNextSimulationCardProps = {
    simulationNumber: 2,
    title: "Hopeless Male, 40",
    scenario:
      "A 40-year-old male is experiencing deep hopelessness. He feels overwhelmed by ongoing personal and professional failures, believes his situation won't improve, and is withdrawing socially. He's showing signs of resignation and low self-worth. Your goal is to explore his thoughts gently, offer validation, and begin rebuilding his sense of agency and hope.",
    coverImage: "https://via.placeholder.com/120",
  };

  describe("Basic Rendering", () => {
    it("should render the simulation card with all elements", () => {
      render(<UpNextSimulationCard {...mockProps} />);

      expect(screen.getByText("Up next - Simulation 2")).toBeInTheDocument();
      expect(screen.getByText("Hopeless Male, 40")).toBeInTheDocument();
      expect(screen.getByText("Scenario:")).toBeInTheDocument();
      expect(
        screen.getByText(/A 40-year-old male is experiencing deep hopelessness/),
      ).toBeInTheDocument();
    });

    it("should render the cover image with correct attributes", () => {
      render(<UpNextSimulationCard {...mockProps} />);

      const image = screen.getByAltText("Hopeless Male, 40");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://via.placeholder.com/120");
    });
  });

  describe("Props Handling", () => {
    it("should display correct simulation number", () => {
      render(<UpNextSimulationCard {...mockProps} simulationNumber={5} />);

      expect(screen.getByText("Up next - Simulation 5")).toBeInTheDocument();
    });

    it("should display custom title", () => {
      render(<UpNextSimulationCard {...mockProps} title="Custom Title" />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("should display custom scenario text", () => {
      const customScenario = "This is a custom scenario description.";
      render(<UpNextSimulationCard {...mockProps} scenario={customScenario} />);

      expect(screen.getByText(customScenario)).toBeInTheDocument();
    });

    it("should use custom cover image URL", () => {
      const customImageUrl = "https://example.com/custom-image.jpg";
      render(<UpNextSimulationCard {...mockProps} coverImage={customImageUrl} />);

      const image = screen.getByAltText(mockProps.title);
      expect(image).toHaveAttribute("src", customImageUrl);
    });
  });

  describe("Styling", () => {
    it("should have correct container classes", () => {
      const { container } = render(<UpNextSimulationCard {...mockProps} />);

      const card = container.querySelector(".rounded-\\[8px\\]");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("rounded-[8px]", "border");
    });

    it("should have correct image dimensions", () => {
      render(<UpNextSimulationCard {...mockProps} />);

      const image = screen.getByAltText(mockProps.title);
      expect(image).toHaveClass("w-[120px]", "h-[60px]", "rounded-[8px]", "object-cover");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty scenario text", () => {
      render(<UpNextSimulationCard {...mockProps} scenario="" />);

      expect(screen.getByText("Scenario:")).toBeInTheDocument();
    });

    it("should handle simulation number 0", () => {
      render(<UpNextSimulationCard {...mockProps} simulationNumber={0} />);

      expect(screen.getByText("Up next - Simulation 0")).toBeInTheDocument();
    });

    it("should handle long scenario text", () => {
      const longScenario = "A".repeat(500);
      render(<UpNextSimulationCard {...mockProps} scenario={longScenario} />);

      expect(screen.getByText(longScenario)).toBeInTheDocument();
    });

    it("should handle special characters in title", () => {
      const specialTitle = "Test & Title <with> 'Special' \"Characters\"";
      render(<UpNextSimulationCard {...mockProps} title={specialTitle} />);

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });
  });
});
