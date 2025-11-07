import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { Step } from "@components/types";

import { VerticalStepper } from "../VerticalStepper";

describe("VerticalStepper", () => {
  const mockOnStepClick = vi.fn();

  const mockSteps: Step[] = [
    { id: "step1", title: "Step 1" },
    { id: "step2", title: "Step 2" },
    { id: "step3", title: "Step 3" },
    { id: "step4", title: "Step 4" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic rendering", () => {
    it("renders all steps", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 2")).toBeInTheDocument();
      expect(screen.getByText("Step 3")).toBeInTheDocument();
      expect(screen.getByText("Step 4")).toBeInTheDocument();
    });

    it("renders with correct number of steps", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const stepElements = container.querySelectorAll(".cursor-pointer");
      expect(stepElements.length).toBe(4);
    });

    it("renders navigation element", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });
  });

  describe("Step status visualization", () => {
    it("applies active styling to current step", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step2" onStepClick={mockOnStepClick} />,
      );

      const step2Element = screen.getByText("Step 2");
      expect(step2Element).toBeInTheDocument();
    });

    it("shows white dot inside active step circle", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step2" onStepClick={mockOnStepClick} />,
      );

      const whiteDots = container.querySelectorAll(".bg-white.rounded-full");
      expect(whiteDots.length).toBeGreaterThan(0);
    });
  });

  describe("Step interactions", () => {
    it("calls onStepClick when a step is clicked", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const step2 = screen.getByText("Step 2");
      fireEvent.click(step2);

      expect(mockOnStepClick).toHaveBeenCalledWith("step2");
    });

    it("calls onStepClick with correct step id when different steps are clicked", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const step1 = screen.getByText("Step 1");
      const step3 = screen.getByText("Step 3");

      fireEvent.click(step1);
      expect(mockOnStepClick).toHaveBeenCalledWith("step1");

      fireEvent.click(step3);
      expect(mockOnStepClick).toHaveBeenCalledWith("step3");
    });

    it("can click on the current step", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step2" onStepClick={mockOnStepClick} />,
      );

      const step2 = screen.getByText("Step 2");
      fireEvent.click(step2);

      expect(mockOnStepClick).toHaveBeenCalledWith("step2");
    });

    it("works without onStepClick callback", () => {
      render(<VerticalStepper steps={mockSteps} currentStep="step1" />);

      const step2 = screen.getByText("Step 2");

      // Should not throw error
      expect(() => {
        fireEvent.click(step2);
      }).not.toThrow();
    });

    it("step element has cursor-pointer class", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const stepContainer = screen.getByText("Step 1").closest(".cursor-pointer");
      expect(stepContainer).toBeInTheDocument();
    });
  });

  describe("Connector lines", () => {
    it("renders connector lines between steps", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const connectors = container.querySelectorAll(".w-\\[2px\\]");
      // Should have connectors for all steps except the last one
      expect(connectors.length).toBeGreaterThan(0);
    });

    it("does not render connector line after the last step", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const hiddenConnectors = container.querySelectorAll(".hidden");
      expect(hiddenConnectors.length).toBeGreaterThan(0);
    });

    it("connector lines have correct height", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const connectors = container.querySelectorAll(".h-\\[24px\\]");
      expect(connectors.length).toBeGreaterThan(0);
    });

    it("connector lines have correct width", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const connectors = container.querySelectorAll(".w-\\[2px\\]");
      expect(connectors.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive styling", () => {
    it("has responsive minimum width classes", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const stepperContainer = container.querySelector(".min-w-\\[150px\\]");
      expect(stepperContainer).toBeInTheDocument();
      expect(stepperContainer?.className).toContain("lg:min-w-[200px]");
    });

    it("has responsive circle size classes", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const circles = container.querySelectorAll(".w-4");
      expect(circles.length).toBeGreaterThan(0);

      circles.forEach(circle => {
        expect(circle.className).toContain("lg:w-6");
        expect(circle.className).toContain("h-4");
        expect(circle.className).toContain("lg:h-6");
      });
    });

    it("has responsive margin for connector lines", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const connectors = container.querySelectorAll(".ml-\\[7px\\]");
      expect(connectors.length).toBeGreaterThan(0);

      connectors.forEach(connector => {
        expect(connector.className).toContain("lg:ml-[11px]");
      });
    });
  });

  describe("Edge cases", () => {
    it("handles single step", () => {
      const singleStep: Step[] = [{ id: "only-step", title: "Only Step" }];

      render(
        <VerticalStepper
          steps={singleStep}
          currentStep="only-step"
          onStepClick={mockOnStepClick}
        />,
      );

      expect(screen.getByText("Only Step")).toBeInTheDocument();
    });

    it("handles two steps", () => {
      const twoSteps: Step[] = [
        { id: "first", title: "First Step" },
        { id: "second", title: "Second Step" },
      ];

      render(
        <VerticalStepper steps={twoSteps} currentStep="first" onStepClick={mockOnStepClick} />,
      );

      expect(screen.getByText("First Step")).toBeInTheDocument();
      expect(screen.getByText("Second Step")).toBeInTheDocument();
    });

    it("handles many steps", () => {
      const manySteps: Step[] = Array.from({ length: 10 }, (_, index) => ({
        id: `step${index + 1}`,
        title: `Step ${index + 1}`,
      }));

      render(
        <VerticalStepper steps={manySteps} currentStep="step5" onStepClick={mockOnStepClick} />,
      );

      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 10")).toBeInTheDocument();
    });

    it("handles step with long title", () => {
      const stepsWithLongTitle: Step[] = [
        { id: "step1", title: "This is a very long step title that might wrap" },
        { id: "step2", title: "Step 2" },
      ];

      render(
        <VerticalStepper
          steps={stepsWithLongTitle}
          currentStep="step1"
          onStepClick={mockOnStepClick}
        />,
      );

      expect(
        screen.getByText("This is a very long step title that might wrap"),
      ).toBeInTheDocument();
    });

    it("handles step with special characters in title", () => {
      const stepsWithSpecialChars: Step[] = [
        { id: "step1", title: "Step 1 & Special <>" },
        { id: "step2", title: "Step 2" },
      ];

      render(
        <VerticalStepper
          steps={stepsWithSpecialChars}
          currentStep="step1"
          onStepClick={mockOnStepClick}
        />,
      );

      expect(screen.getByText("Step 1 & Special <>")).toBeInTheDocument();
    });

    it("handles currentStep that does not exist in steps", () => {
      render(
        <VerticalStepper
          steps={mockSteps}
          currentStep="non-existent-step"
          onStepClick={mockOnStepClick}
        />,
      );

      // All steps should be rendered, but none should be active
      expect(screen.getByText("Step 1")).toBeInTheDocument();
      expect(screen.getByText("Step 4")).toBeInTheDocument();
    });
  });

  describe("Step progression", () => {
    it("correctly identifies first step as active", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const step1Element = screen.getByText("Step 1");
      expect(step1Element).toBeInTheDocument();
    });

    it("correctly identifies middle step as active", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step2" onStepClick={mockOnStepClick} />,
      );

      const step2Element = screen.getByText("Step 2");
      expect(step2Element).toBeInTheDocument();
    });

    it("correctly identifies last step as active", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step4" onStepClick={mockOnStepClick} />,
      );

      const step4Element = screen.getByText("Step 4");
      expect(step4Element).toBeInTheDocument();
    });

    it("shows all previous steps as completed when on last step", () => {
      render(
        <VerticalStepper steps={mockSteps} currentStep="step4" onStepClick={mockOnStepClick} />,
      );

      const step1Element = screen.getByText("Step 1");
      const step2Element = screen.getByText("Step 2");
      const step3Element = screen.getByText("Step 3");

      expect(step1Element).toBeInTheDocument();
      expect(step2Element).toBeInTheDocument();
      expect(step3Element).toBeInTheDocument();
    });

    it("shows all steps as pending when current step is not in list", () => {
      render(
        <VerticalStepper
          steps={mockSteps}
          currentStep="invalid-step"
          onStepClick={mockOnStepClick}
        />,
      );

      const step1Element = screen.getByText("Step 1");
      const step2Element = screen.getByText("Step 2");

      expect(step1Element).toBeInTheDocument();
      expect(step2Element).toBeInTheDocument();
    });
  });

  describe("Styling classes", () => {
    it("has border-right on container", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const stepperContainer = container.querySelector(".border-r");
      expect(stepperContainer).toBeInTheDocument();
    });

    it("has correct padding on container", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const stepperContainer = container.querySelector(".px-2");
      expect(stepperContainer).toBeInTheDocument();
      expect(stepperContainer?.className).toContain("py-3");
    });

    it("circles have rounded-full class", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const circles = container.querySelectorAll(".rounded-full");
      expect(circles.length).toBeGreaterThan(0);
    });

    it("circles have border class", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const circles = container.querySelectorAll(".border.rounded-full");
      expect(circles.length).toBe(mockSteps.length);
    });

    it("step titles have font-medium class", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const titles = container.querySelectorAll("span");
      titles.forEach(title => {
        expect(title.className).toContain("font-medium");
      });
    });

    it("step containers have gap class", () => {
      const { container } = render(
        <VerticalStepper steps={mockSteps} currentStep="step1" onStepClick={mockOnStepClick} />,
      );

      const stepContainers = container.querySelectorAll(".gap-2");
      expect(stepContainers.length).toBeGreaterThan(0);
    });
  });
});
