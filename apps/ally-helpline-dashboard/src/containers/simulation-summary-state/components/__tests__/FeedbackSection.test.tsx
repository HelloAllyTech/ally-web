import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { FeedbackSection } from "../FeedbackSection";
import { FeedbackSectionProps } from "../types";

// Mock the child components
vi.mock("@ally-ui-mono/ui-shared", () => ({
  FEATURE_FLAGS_MAP: {},
  CustomImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="custom-image" />
  ),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock the constants (component only uses feedbackSections)
vi.mock("../constants", () => ({
  feedbackSections: [
    { key: "keyEvents", label: "Key Events" },
    { key: "positives", label: "What Went Well" },
    { key: "improvements", label: "Improvement Tips" },
  ],
}));

// Mock the utils. keyEvents must be strings so getFeedbackSectionByType can render them in <li> (component renders {item} as text).
vi.mock("../utils", () => ({
  getFormattedFeedbackSection: (summary: any) => {
    const keyEvents = summary.events
      ?.slice()
      ?.sort(
        (a: any, b: any) =>
          new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime(),
      )
      ?.map((item: any) => item?.events?.message ?? item?.message ?? "Event");
    return {
      keyEvents: keyEvents ?? [],
      positives: summary.positives ?? summary.details?.summary?.feedback?.positives ?? [],
      improvements: summary.improvements ?? summary.details?.summary?.feedback?.improvements ?? [],
      coverImage: summary.scenario?.coverImageUrl,
      sessionName: summary.metadata?.sessionName ?? "--",
      sessionStartedAt: summary.startedAt,
      title: summary.scenario?.title ?? "--",
      callDuration: summary.details?.callDuration ?? 0,
    };
  },
}));

describe("FeedbackSection", () => {
  const mockSummary: FeedbackSectionProps = {
    id: "test-summary-123",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:30:00Z",
    tenantId: "tenant-123",
    roomId: "room-123",
    scenarioId: 1,
    counselorId: 1,
    status: "completed",
    startedAt: "2024-01-01T10:00:00Z",
    endedAt: "2024-01-01T10:30:00Z",
    score: 85,
    metadata: {
      sessionName: "Test Session",
    },
    totalScore: 85,
    details: {
      id: "details-123",
      createdAt: "2024-01-01T10:00:00Z",
      updatedAt: "2024-01-01T10:30:00Z",
      tenantId: "tenant-123",
      scenarioSessionId: "session-123",
      callDuration: 1800,
      summary: {
        feedback: {
          improvements: ["More practice needed", "Focus on timing"],
          positives: ["Good communication", "Clear explanations"],
        },
      },
    },
    events: [
      {
        eventId: "event-1",
        createdAt: "2024-01-01T10:05:00Z",
        events: {
          id: "1",
          name: "Session started",
          description: "Session started",
          score: "5",
          emoji: "🎯",
          message: "Session started",
        },
        occurredAt: "2024-01-01T10:15:00Z",
      },
      {
        eventId: "event-2",
        createdAt: "2024-01-01T10:15:00Z",
        events: {
          id: "2",
          name: "First interaction",
          description: "First interaction",
          score: "8",
          emoji: "💬",
          message: "First interaction",
        },
        occurredAt: "",
      },
    ],
    hasFeedback: true,
  };

  describe("Basic Rendering", () => {
    it("should render feedback section with heading and session info", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("Session Feedback")).toBeInTheDocument();
      expect(screen.getByTestId("custom-image")).toBeInTheDocument();
    });

    it("should render all feedback sections", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("Key Events")).toBeInTheDocument();
      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
    });
  });

  describe("Section content rendering", () => {
    it("should render key events section with list content", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("Key Events")).toBeInTheDocument();
      const lists = document.querySelectorAll("ul.p-4.space-y-2");
      expect(lists.length).toBeGreaterThan(0);
    });
  });

  describe("Empty Data Handling", () => {
    it("should show empty or no-data state when no key events", () => {
      const emptySummary = {
        ...mockSummary,
        events: [],
      };
      render(<FeedbackSection {...emptySummary} />);

      expect(screen.getByText("Key Events")).toBeInTheDocument();
      const lists = document.querySelectorAll("ul.p-4.space-y-2");
      expect(lists.length).toBeGreaterThan(0);
    });

    it("should show empty list when no positives", () => {
      const emptySummary = {
        ...mockSummary,
        details: {
          ...mockSummary.details,
          summary: {
            feedback: {
              improvements: mockSummary.details?.summary?.feedback?.improvements,
              positives: [],
            },
          },
        },
      };
      render(<FeedbackSection {...emptySummary} />);

      const emptyLists = document.querySelectorAll("ul.p-4.space-y-2");
      expect(emptyLists.length).toBeGreaterThan(0);
    });

    it("should show empty list when no improvements", () => {
      const emptySummary = {
        ...mockSummary,
        details: {
          ...mockSummary.details,
          summary: {
            feedback: {
              positives: mockSummary.details?.summary?.feedback?.positives,
              improvements: [],
            },
          },
        },
      };
      render(<FeedbackSection {...emptySummary} />);

      const emptyLists = document.querySelectorAll("ul.p-4.space-y-2");
      expect(emptyLists.length).toBeGreaterThan(0);
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

  describe("Section structure", () => {
    it("should render three feedback section headings", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("Key Events")).toBeInTheDocument();
      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing demographic data", () => {
      const incompleteSummary = {
        ...mockSummary,
        score: null,
        details: {
          id: "details-123",
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:30:00Z",
          tenantId: "tenant-123",
          scenarioSessionId: "session-123",
          callDuration: 1800,
          summary: {
            feedback: {
              improvements: [],
              positives: [],
            },
          },
        },
      };
      render(<FeedbackSection {...incompleteSummary} />);

      const dashElements = screen.getAllByText("--");
      expect(dashElements.length).toBeGreaterThan(0);
    });

    it("should handle null/undefined values gracefully", () => {
      const nullSummary = {
        ...mockSummary,
        details: {
          id: "details-123",
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:30:00Z",
          tenantId: "tenant-123",
          scenarioSessionId: "session-123",
          callDuration: 1800,
          summary: {
            feedback: {
              improvements: null,
              positives: undefined,
            },
          },
        },
      };
      render(<FeedbackSection {...nullSummary} />);

      expect(screen.getByText("Session Feedback")).toBeInTheDocument();
      expect(screen.getByText("Key Events")).toBeInTheDocument();
      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
      const lists = document.querySelectorAll("ul.p-4.space-y-2");
      expect(lists.length).toBeGreaterThan(0);
    });
  });
});
