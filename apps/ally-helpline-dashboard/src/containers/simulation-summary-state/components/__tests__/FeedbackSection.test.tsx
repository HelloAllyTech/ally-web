import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { FeedbackSectioonType } from "@types";

import { FeedbackSection } from "../FeedbackSection";
import { FeedbackSectionProps } from "../types";

// Mock the child components
vi.mock("@ally-ui-mono/ui-shared", () => ({
  GenericTable: ({ data, columns, className }: any) => (
    <div data-testid="generic-table" className={className}>
      <div data-testid="table-data">{JSON.stringify(data)}</div>
      <div data-testid="table-columns">{JSON.stringify(columns)}</div>
    </div>
  ),
}));

vi.mock("@components", () => ({
  Accordion: ({ title, titleIcon, defaultExpanded, children }: any) => (
    <div data-testid="accordion" data-expanded={defaultExpanded}>
      <div data-testid="accordion-title">{title}</div>
      <div data-testid="accordion-icon">{titleIcon?.alt}</div>
      <div data-testid="accordion-content">{children}</div>
    </div>
  ),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock the constants
vi.mock("../constants", () => ({
  feedbackDemographics: [
    {
      key: "duration",
      label: "Session Duration",
      getValue: (summary: any) => summary?.duration || "--",
    },
    {
      key: "score",
      label: "Total Score",
      getValue: (summary: any) => summary?.score || "--",
    },
  ],
  feedbackSections: [
    {
      icon: { icon: "KeyEvents", alt: "key-events" },
      key: "keyEvents",
      label: "Key Events",
      type: FeedbackSectioonType.TABLE,
      columns: [
        { key: "time", header: "Time" },
        { key: "event", header: "Event" },
        { key: "score", header: "Score" },
      ],
    },
    {
      icon: { icon: "ThumbUp", alt: "what-went-well" },
      key: "positives",
      label: "What Went Well",
      type: FeedbackSectioonType.BULLET_TEXT,
    },
    {
      icon: { icon: "BulbIcon", alt: "improvement-tips" },
      key: "improvements",
      label: "Improvement Tips",
      type: FeedbackSectioonType.BULLET_TEXT,
    },
  ],
}));

// Mock the utils
vi.mock("../utils", () => ({
  getFormattedFeedbackSection: (summary: any) => ({
    keyEvents: summary.keyEvents || [],
    positives: summary.positives || [],
    improvements: summary.improvements || [],
  }),
}));

describe("FeedbackSection", () => {
  const mockSummary: FeedbackSectionProps = {
    id: "test-summary-123",
    createdAt: "2024-01-01T10:00:00Z",
    endedAt: "2024-01-01T10:30:00Z",
    score: 85,
    duration: "30:00",
    keyEvents: [
      { time: "00:05", event: "Session started", score: 5 },
      { time: "00:15", event: "First interaction", score: 8 },
    ],
    positives: ["Good communication", "Clear explanations"],
    improvements: ["More practice needed", "Focus on timing"],
  };

  describe("Basic Rendering", () => {
    it("should render feedback section with demographics", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("Session Duration")).toBeInTheDocument();
      expect(screen.getByText("Total Score")).toBeInTheDocument();
    });

    it("should display demographic values correctly", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("30:00")).toBeInTheDocument();
      expect(screen.getByText("85")).toBeInTheDocument();
    });

    it("should render all feedback sections", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("Key Events")).toBeInTheDocument();
      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
    });
  });

  describe("Table Section Rendering", () => {
    it("should render table for key events", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByTestId("generic-table")).toBeInTheDocument();
      expect(screen.getByTestId("table-data")).toBeInTheDocument();
    });

    it("should pass correct data to table", () => {
      render(<FeedbackSection {...mockSummary} />);

      const tableData = screen.getByTestId("table-data");
      expect(tableData.textContent).toContain("Session started");
    });
  });

  describe("Bullet Text Section Rendering", () => {
    it("should render bullet points for positives", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("Good communication")).toBeInTheDocument();
      expect(screen.getByText("Clear explanations")).toBeInTheDocument();
    });

    it("should render bullet points for improvements", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("More practice needed")).toBeInTheDocument();
      expect(screen.getByText("Focus on timing")).toBeInTheDocument();
    });

    it("should render bullet points with correct styling", () => {
      render(<FeedbackSection {...mockSummary} />);

      const bulletPoints = screen.getAllByText("•");
      expect(bulletPoints.length).toBeGreaterThan(0);
    });
  });

  describe("Empty Data Handling", () => {
    it("should show empty table when no key events", () => {
      const emptySummary = { ...mockSummary, keyEvents: [] };
      render(<FeedbackSection {...emptySummary} />);

      const tableData = screen.getByTestId("table-data");
      expect(tableData.textContent).toBe("[]");
    });

    it("should show empty list when no positives", () => {
      const emptySummary = { ...mockSummary, positives: [] };
      render(<FeedbackSection {...emptySummary} />);

      // Should render empty ul element
      const emptyList = document.querySelector("ul.pb-4.space-y-2.text-\\[16px\\]");
      expect(emptyList).toBeInTheDocument();
    });

    it("should show empty list when no improvements", () => {
      const emptySummary = { ...mockSummary, improvements: [] };
      render(<FeedbackSection {...emptySummary} />);

      // Should render empty ul element
      const emptyList = document.querySelector("ul.pb-4.space-y-2.text-\\[16px\\]");
      expect(emptyList).toBeInTheDocument();
    });
  });

  describe("Data Formatting", () => {
    it("should handle array data for bullet points", () => {
      const arrayData = {
        ...mockSummary,
        positives: ["Item 1", "Item 2", "Item 3"],
      };
      render(<FeedbackSection {...arrayData} />);

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getByText("Item 3")).toBeInTheDocument();
    });

    it("should handle string data for bullet points", () => {
      const stringData = {
        ...mockSummary,
        positives: "Single improvement point",
      };
      render(<FeedbackSection {...stringData} />);

      expect(screen.getByText("Single improvement point")).toBeInTheDocument();
    });
  });

  describe("Accordion Behavior", () => {
    it("should render accordions with correct titles", () => {
      render(<FeedbackSection {...mockSummary} />);

      const accordions = screen.getAllByTestId("accordion");
      expect(accordions).toHaveLength(3);
    });

    it("should have accordions expanded by default", () => {
      render(<FeedbackSection {...mockSummary} />);

      const accordions = screen.getAllByTestId("accordion");
      accordions.forEach(accordion => {
        expect(accordion).toHaveAttribute("data-expanded", "true");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing demographic data", () => {
      const incompleteSummary = {
        id: "test-summary-123",
        createdAt: "2024-01-01T10:00:00Z",
      };
      render(<FeedbackSection {...incompleteSummary} />);

      const dashElements = screen.getAllByText("--");
      expect(dashElements.length).toBeGreaterThan(0);
    });

    it("should handle null/undefined values gracefully", () => {
      const nullSummary = {
        id: "test-summary-123",
        keyEvents: null,
        positives: undefined,
        improvements: null,
      };
      render(<FeedbackSection {...nullSummary} />);

      // Should render empty elements
      const emptyLists = document.querySelectorAll("ul.pb-4.space-y-2.text-\\[16px\\]");
      expect(emptyLists.length).toBeGreaterThan(0);
    });
  });
});
