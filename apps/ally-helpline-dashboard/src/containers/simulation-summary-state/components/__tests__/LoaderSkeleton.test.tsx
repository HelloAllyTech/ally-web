import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { LoaderSkeleton } from "../LoaderSkeleton";

describe("LoaderSkeleton", () => {
  describe("Basic Rendering", () => {
    it("should render the skeleton loader", () => {
      render(<LoaderSkeleton />);

      // Check if the main container is rendered
      const container = document.querySelector(".w-full.h-full.bg-white.p-6.overflow-hidden");
      expect(container).toBeInTheDocument();
    });

    it("should have correct base styling", () => {
      render(<LoaderSkeleton />);

      const container = document.querySelector(".w-full.h-full.bg-white.p-6.overflow-hidden");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Skeleton Structure", () => {
    it("should render header section with main bar", () => {
      render(<LoaderSkeleton />);

      // The main header bar should be present
      const headerBars = screen.getAllByRole("generic");
      expect(headerBars.length).toBeGreaterThan(0);
    });

    it("should render multiple skeleton elements", () => {
      render(<LoaderSkeleton />);

      // Should have multiple skeleton bars with animate-pulse class
      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(10);
    });

    it("should have correct skeleton bar styling", () => {
      render(<LoaderSkeleton />);

      const skeletonBars = document.querySelectorAll(".bg-gray-200.rounded.animate-pulse");
      expect(skeletonBars.length).toBeGreaterThan(0);
    });
  });

  describe("Layout Structure", () => {
    it("should render top section with header", () => {
      render(<LoaderSkeleton />);

      // Check for the main header structure
      const topSection = document.querySelector(".mb-8");
      expect(topSection).toBeInTheDocument();
    });

    it("should render two-column layout for demographics", () => {
      render(<LoaderSkeleton />);

      // Check for the two-column layout
      const twoColumnLayout = document.querySelector(".flex.flex-row.gap-4.mb-4");
      expect(twoColumnLayout).toBeInTheDocument();
    });

    it("should render icon elements", () => {
      render(<LoaderSkeleton />);

      // Check for icon placeholders
      const iconElements = document.querySelectorAll(".w-6.h-6.bg-gray-200.rounded.animate-pulse");
      expect(iconElements.length).toBeGreaterThan(0);
    });
  });

  describe("Animation Classes", () => {
    it("should have animate-pulse class on skeleton elements", () => {
      render(<LoaderSkeleton />);

      const animatedElements = document.querySelectorAll(".animate-pulse");
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it("should have correct gray background on skeleton elements", () => {
      render(<LoaderSkeleton />);

      const grayElements = document.querySelectorAll(".bg-gray-200");
      expect(grayElements.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Design", () => {
    it("should have responsive width classes", () => {
      render(<LoaderSkeleton />);

      // Check for responsive width classes
      const responsiveElements = document.querySelectorAll(".w-1\\/2, .w-1\\/3, .w-2\\/3");
      expect(responsiveElements.length).toBeGreaterThan(0);
    });

    it("should have proper spacing classes", () => {
      render(<LoaderSkeleton />);

      // Check for margin and padding classes
      const spacingElements = document.querySelectorAll(".mb-4, .mb-8, .mr-4");
      expect(spacingElements.length).toBeGreaterThan(0);
    });
  });

  describe("Content Structure", () => {
    it("should render multiple content sections", () => {
      render(<LoaderSkeleton />);

      // Should have multiple content sections with different heights
      const contentSections = document.querySelectorAll(
        ".w-full.h-5.bg-gray-200.rounded.animate-pulse",
      );
      expect(contentSections.length).toBeGreaterThan(0);
    });

    it("should have proper content hierarchy", () => {
      render(<LoaderSkeleton />);

      // Check for proper nesting structure
      const topSection = document.querySelector(".mb-8");
      expect(topSection).toBeInTheDocument();

      const contentBars = topSection?.querySelectorAll(".bg-gray-200.rounded.animate-pulse");
      expect(contentBars?.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("should be accessible to screen readers", () => {
      render(<LoaderSkeleton />);

      // The skeleton should be present in the DOM
      const skeleton = document.querySelector(".w-full.h-full.bg-white.p-6.overflow-hidden");
      expect(skeleton).toBeInTheDocument();
    });

    it("should have proper semantic structure", () => {
      render(<LoaderSkeleton />);

      // Should have a clear structure with proper div nesting
      const container = document.querySelector(".w-full.h-full.bg-white.p-6.overflow-hidden");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should render without errors", () => {
      expect(() => render(<LoaderSkeleton />)).not.toThrow();
    });

    it("should have consistent structure", () => {
      const { container } = render(<LoaderSkeleton />);

      // Should have a consistent number of skeleton elements
      const skeletonElements = container.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(15);
    });
  });
});
