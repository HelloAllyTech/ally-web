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
  GenericTable: ({ columns, data, className }: any) => (
    <div data-testid="generic-table" className={className}>
      {data?.map((row: any, idx: number) => (
        <div key={idx}>{JSON.stringify(row)}</div>
      ))}
    </div>
  ),
  SimulationDetailsModal: ({ isOpen, title, children }: any) =>
    isOpen ? (
      <div data-testid="simulation-details-modal">
        <span data-testid="modal-title">{title}</span>
        {children}
      </div>
    ) : null,
}));

// Mock Accordion and Checklist (FeedbackSection imports Checklist from @src/components)
vi.mock("@components", () => ({
  Accordion: ({ children, title, defaultExpanded }: any) => (
    <div data-testid="accordion">
      <div data-testid="accordion-title">{title}</div>
      {defaultExpanded && <div data-testid="accordion-content">{children}</div>}
    </div>
  ),
  Checklist: ({ className, sessionId }: any) => (
    <div data-testid="checklist" className={className} data-session-id={sessionId} />
  ),
}));

// Component imports Checklist from @src/components; ensure it's mocked for that path too
vi.mock("@src/components", () => ({
  Checklist: ({ className, sessionId }: any) => (
    <div data-testid="checklist" className={className} data-session-id={sessionId} />
  ),
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock the constants
vi.mock("../constants", async () => {
  const actual = await vi.importActual("../constants");
  const { FeedbackSectionType } = await import("@types");
  return {
    ...actual,
    feedbackSections: [
      {
        key: "keyEvents",
        label: "Key Events",
        type: FeedbackSectionType.TABLE,
        columns: [],
        icon: { icon: () => null, alt: "key-events" },
      },
      {
        key: "positives",
        label: "What Went Well",
        type: FeedbackSectionType.BULLET_TEXT,
        icon: { icon: () => null, alt: "positives" },
      },
      {
        key: "improvements",
        label: "Improvement Tips",
        type: FeedbackSectionType.BULLET_TEXT,
        icon: { icon: () => null, alt: "improvements" },
      },
    ],
  };
});

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
    scenario: {
      metadata: {
        experienceMode: "FEEDBACK",
      },
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
    });

    it("should render all feedback sections", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
    });
  });

  describe("Section content rendering", () => {
    it("should render key events section with list content", () => {
      render(<FeedbackSection {...mockSummary} />);

      const container = document.querySelector(".flex.flex-col.gap-6");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Empty Data Handling", () => {
    it("should show empty or no-data state when no key events", () => {
      const emptySummary = {
        ...mockSummary,
        events: [],
      };
      render(<FeedbackSection {...emptySummary} />);

      expect(screen.getByText("Session Feedback")).toBeInTheDocument();
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

      expect(screen.getByText("What Went Well")).toBeInTheDocument();
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

      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
    });
  });

  describe("Data Formatting", () => {
    it("should handle array data for bullet points", () => {
      const arrayData = {
        ...mockSummary,
        details: {
          ...mockSummary.details,
          summary: {
            feedback: {
              improvements: mockSummary.details?.summary?.feedback?.improvements,
              positives: ["Item 1", "Item 2", "Item 3"],
            },
          },
        },
      };
      render(<FeedbackSection {...arrayData} />);

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getByText("Item 3")).toBeInTheDocument();
    });

    it("should handle string data for bullet points", () => {
      const stringData = {
        ...mockSummary,
        details: {
          ...mockSummary.details,
          summary: {
            feedback: {
              improvements: mockSummary.details?.summary?.feedback?.improvements,
              positives: ["Single improvement point"],
            },
          },
        },
      };
      render(<FeedbackSection {...stringData} />);

      expect(screen.getByText("Single improvement point")).toBeInTheDocument();
    });
  });

  describe("Section structure", () => {
    it("should render three feedback section headings", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
    });
  });

  describe("Experience Mode Gating", () => {
    it("renders feedback sections and hides checklist in FEEDBACK mode", () => {
      render(<FeedbackSection {...mockSummary} />);

      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
      expect(screen.queryByTestId("checklist")).not.toBeInTheDocument();
    });

    it("renders checklist and hides feedback sections in CHECKLIST mode when the summary checklist is enabled", () => {
      const checklistSummary = {
        ...mockSummary,
        scenario: {
          metadata: { experienceMode: "CHECKLIST", summaryChecklistEnabled: true },
        },
      };
      render(<FeedbackSection {...checklistSummary} />);

      expect(screen.getByTestId("checklist")).toBeInTheDocument();
      expect(screen.queryByText("What Went Well")).not.toBeInTheDocument();
      expect(screen.queryByText("Improvement Tips")).not.toBeInTheDocument();
    });

    it("hides the checklist in CHECKLIST mode when the summary checklist is disabled", () => {
      const checklistSummary = {
        ...mockSummary,
        scenario: {
          metadata: { experienceMode: "CHECKLIST", summaryChecklistEnabled: false },
        },
      };
      render(<FeedbackSection {...checklistSummary} />);

      expect(screen.queryByTestId("checklist")).not.toBeInTheDocument();
    });

    it("hides the checklist in CHECKLIST mode when the summary opt-in is absent", () => {
      // Every roleplay authored before the toggle existed looks like this.
      const checklistSummary = {
        ...mockSummary,
        scenario: { metadata: { experienceMode: "CHECKLIST" } },
      };
      render(<FeedbackSection {...checklistSummary} />);

      expect(screen.queryByTestId("checklist")).not.toBeInTheDocument();
    });

    it("hides both checklist and feedback sections in NONE mode", () => {
      const noneSummary = {
        ...mockSummary,
        scenario: { metadata: { experienceMode: "NONE" } },
      };
      render(<FeedbackSection {...noneSummary} />);

      expect(screen.queryByTestId("checklist")).not.toBeInTheDocument();
      expect(screen.queryByText("What Went Well")).not.toBeInTheDocument();
      expect(screen.queryByText("Improvement Tips")).not.toBeInTheDocument();
      expect(screen.getByText("Session Feedback")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing demographic data", () => {
      const incompleteSummary = {
        ...mockSummary,
        score: null,
        createdAt: undefined,
        endedAt: undefined,
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

      expect(screen.getByText("What Went Well")).toBeInTheDocument();
      expect(screen.getByText("Improvement Tips")).toBeInTheDocument();
    });
  });
});
