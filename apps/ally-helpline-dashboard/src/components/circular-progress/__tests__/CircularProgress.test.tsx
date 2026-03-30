import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { CircularProgress } from "../CircularProgress";

describe("CircularProgress", () => {
  describe("Rendering", () => {
    it("should render with default props", () => {
      const { container } = render(<CircularProgress current={3} total={10} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
      expect(screen.getByText("3/10")).toBeInTheDocument();
    });

    it("should render with custom size", () => {
      const { container } = render(<CircularProgress current={5} total={10} size={60} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 60 60");
    });

    it("should hide label when showLabel is false", () => {
      render(<CircularProgress current={3} total={10} showLabel={false} />);
      expect(screen.queryByText("3/10")).not.toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <CircularProgress current={3} total={10} className="custom-class" />,
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass("custom-class");
    });
  });

  describe("Progress Calculation", () => {
    it("should show correct progress for 0%", () => {
      render(<CircularProgress current={0} total={10} />);
      expect(screen.getByText("0/10")).toBeInTheDocument();
    });

    it("should show correct progress for 50%", () => {
      render(<CircularProgress current={5} total={10} />);
      expect(screen.getByText("5/10")).toBeInTheDocument();
    });

    it("should show correct progress for 100%", () => {
      render(<CircularProgress current={10} total={10} />);
      expect(screen.getByText("10/10")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should render two circles (background and progress)", () => {
      const { container } = render(<CircularProgress current={3} total={10} />);
      const circles = container.querySelectorAll("circle");
      expect(circles).toHaveLength(2);
    });

    it("should apply custom colors", () => {
      const { container } = render(
        <CircularProgress
          current={3}
          total={10}
          progressColor="#FF0000"
          backgroundColor="#00FF00"
        />,
      );
      const circles = container.querySelectorAll("circle");
      expect(circles[0]).toHaveAttribute("stroke", "#00FF00");
      expect(circles[1]).toHaveAttribute("stroke", "#FF0000");
    });

    it("should apply custom text color class", () => {
      render(<CircularProgress current={3} total={10} textColor="text-red-500" />);
      const label = screen.getByText("3/10");
      expect(label).toHaveClass("text-red-500");
    });
  });

  describe("Accessibility", () => {
    it("should render SVG with proper viewBox", () => {
      const { container } = render(<CircularProgress current={3} total={10} size={40} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("viewBox", "0 0 40 40");
    });
  });
});
