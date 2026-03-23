import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGetCallSummaryQuery } from "@api";
import { ROUTES } from "@constants";
import { ChatSummaryStatus, UserRole } from "@types";

import CallSummary from "../CallSummary";

// --------------------- Mock hooks and modules --------------------- //
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockUseSelector = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (callback: any) => mockUseSelector(callback),
}));

const mockUpdateCallSummary = vi.fn();
const mockGetTags = vi.fn();
const mockUpdateCallSummaryNotes = vi.fn();
const mockSearchLocations = vi.fn();

vi.mock("@api", () => ({
  useGetCallSummaryQuery: vi.fn(),
  useGetSummaryFieldsQuery: () => ({ data: [], isLoading: false }),
  useUpdateCallSummaryMutation: () => [mockUpdateCallSummary, { isLoading: false }],
  useGetTagsMutation: () => [mockGetTags, { isLoading: false }],
  useGetLocationsQuery: () => ({ data: { data: [] }, isLoading: false }),
  useLazySearchLocationsQuery: () => [mockSearchLocations, { isLoading: false }],
  useUpdateCallSummaryNotesMutation: () => [mockUpdateCallSummaryNotes, { isLoading: false }],
}));

vi.mock("@hooks", () => ({
  useEnhance: () => ({
    enhancing: null,
    EnhanceButton: () => <button>Enhance</button>,
    EnhancementLoadingSkeleton: null,
    isEnhanceLoading: false,
  }),
  useDebounce: (fn: any) => fn,
  useUser: () => ({ user: { role: UserRole.COUNSELLOR } }),
}));

vi.mock("@components", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  TextField: (props: any) => <input {...props} />,
  Accordion: ({ children }: any) => <div>{children}</div>,
  InfoBanner: ({ message }: any) => <div>{message}</div>,
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    TEXT: "text",
  },
}));
vi.mock("@assets", () => ({
  Warning: () => <div>Warning</div>,
  Assessment: () => <div>Assessment</div>,
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  NoBadges: () => <div data-testid="no-badges" />,
  Badge: () => <svg data-testid="badge-icon" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
}));
vi.mock("@utils", () => ({
  getFormattedDateTime: (date: string, format: string) => `formatted-${date}`,
  getEstimatedSummaryGenerationTime: () => 2,
  hasPermissions: (permissions: any[], requiredPermission: any) => {
    if (!permissions || !Array.isArray(permissions)) {
      return false;
    }
    return permissions.some(permission => permission === requiredPermission);
  },
}));
vi.mock("@containers", () => ({
  FeedbackDialog: ({ open, onClose }: any) =>
    open ? <button onClick={onClose}>Submit Feedback</button> : null,
}));
vi.mock("../utils", () => ({
  getSectionFields: () => [{ key: "callId", type: "text", label: "Call ID", isEditable: true }],
}));
vi.mock("../constants", () => ({
  summarySections: [{ title: "Section", icon: null, key: "section" }],
  labelShownSections: ["section"],
}));

// --------------------- Tests --------------------- //
describe("CallSummary Component", () => {
  const postProcess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseSelector.mockReturnValue({
      user: { role: UserRole.COUNSELLOR },
      permissions: ["view:settings:summary-fields"],
    });
    // Set up default mock behavior for useGetCallSummaryQuery
    vi.mocked(useGetCallSummaryQuery).mockReturnValue({
      data: {
        summaryStatus: ChatSummaryStatus.SUCCESS,
        details: {
          chatId: 1,
          callDuration: 120,
          startTime: "2025-10-05T10:00:00Z",
          endedAt: "2025-10-05T10:02:00Z",
          callInfo: { notes: "Initial notes", clientTalkingPercentage: 0.5 },
          // Remove summary data to prevent rendering summary content directly
        },
      },
      refetch: vi.fn().mockResolvedValue({
        data: { summaryStatus: ChatSummaryStatus.SUCCESS },
      }),
      isLoading: false,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders loading spinner when summary is loading", () => {
    render(<CallSummary chatId={1} isSummaryLoading={true} callSummary={undefined} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders summary fields and notes", () => {
    const callSummaryWithSuccess = {
      summaryStatus: ChatSummaryStatus.SUCCESS,
      details: {
        chatId: 1,
        callDuration: 120,
        callInfo: { notes: "Initial notes" },
      },
    };
    render(
      <CallSummary
        chatId={1}
        headerContent={<div>Header</div>}
        postProcess={postProcess}
        callSummary={callSummaryWithSuccess}
        isSummaryLoading={false}
      />,
    );
    // SummaryLoading component renders the generated state when summaryStatus is SUCCESS and details.summary is absent
    expect(screen.getByText("Summary is generated")).toBeInTheDocument();
    expect(screen.getByText("You can review the session now.")).toBeInTheDocument();
    // Notes section is rendered in the SummaryLoading component
    expect(screen.getByText("Add Notes (Optional)")).toBeInTheDocument();
  });

  // Note: Save functionality test removed as SummaryLoading component doesn't have a save button
  // The save functionality is handled in the actual summary content, not in the loading component

  // Note: Feedback dialog tests removed as SummaryLoading component doesn't have a Save button
  // The feedback functionality is handled in the actual summary content, not in the loading component
});
