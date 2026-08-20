import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Permissions } from "@constants";

import SummaryHeader from "../SummaryHeader";

// Mock Redux
const mockUseSelector = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (fn: any) => mockUseSelector(fn),
}));

// Mock API hooks
const mockUpdateCallInfo = vi.fn();
const mockUseGetCallSummaryQuery = vi.fn();
vi.mock("@api", () => ({
  useUpdateCallInfoMutation: () => [mockUpdateCallInfo],
  useGetCallSummaryQuery: (chatId: number) => mockUseGetCallSummaryQuery(chatId),
}));

// Mock hooks
vi.mock("@hooks", () => ({
  useDebounce: (fn: any) => fn,
}));

// Mock assets/components
vi.mock("@assets", () => ({
  CharacterLibraryIcon: (props: any) => <svg {...props} data-testid="character-library-icon" />,
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  Edit: (props: any) => <div {...props}>EditIcon</div>,
  Carousel1: (props: any) => <div {...props}>Carousel1</div>,
  Carousel2: (props: any) => <div {...props}>Carousel2</div>,
  Carousel3: (props: any) => <div {...props}>Carousel3</div>,
  Carousel4: (props: any) => <div {...props}>Carousel4</div>,
  LearnIcon: () => <svg data-testid="learn-icon" />,
  Leaderboard: () => <svg data-testid="leaderboard-icon" />,
  ScribeIcon: () => <svg data-testid="scribe-icon" />,
  ScenarioIcon: () => <svg data-testid="scenario-icon" />,
  StatsIcon: () => <svg data-testid="stats-icon" />,
  SearchIcon: () => <svg data-testid="search-icon" />,
  NoBadges: () => <div data-testid="no-badges" />,
  Badge: () => <svg data-testid="badge-icon" />,
  ReviewNavIcon: () => <svg data-testid="review-nav-icon" />,
}));
vi.mock("@components", () => ({ TextField: (props: any) => <input {...props} /> }));

describe("SummaryHeader", () => {
  const chatId = 1;
  const counsellorId = 1;
  const setSummaryName = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup: user with permission and matching counselorId
    mockUseSelector.mockImplementation((fn: any) =>
      fn({
        user: {
          user: { role: "COUNSELLOR", userId: 1 },
          permissions: [Permissions.EDIT_CALL_DETAILS],
        },
      }),
    );
    mockUseGetCallSummaryQuery.mockReturnValue({ data: { counselorId: 1 } });
  });

  it("renders summary name", () => {
    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counsellorId={counsellorId}
      />,
    );
    expect(screen.getByDisplayValue("Test Summary")).toBeInTheDocument();
  });

  it("clicking Edit enables renaming and focuses input", () => {
    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counsellorId={counsellorId}
      />,
    );
    fireEvent.click(screen.getByText("EditIcon"));
    const input = screen.getByDisplayValue("Test Summary") as HTMLInputElement;

    // Check that the input is no longer disabled (pointer-events-none class removed)
    expect(input).not.toHaveClass("pointer-events-none");

    // Check that the Edit button is no longer visible (since isRenaming is true)
    expect(screen.queryByText("EditIcon")).not.toBeInTheDocument();
  });

  it("changing input calls setSummaryName and updateCallInfo", () => {
    render(
      <SummaryHeader
        summaryName="Old Name"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counsellorId={counsellorId}
      />,
    );
    const input = screen.getByDisplayValue("Old Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "New Name" } });
    expect(setSummaryName).toHaveBeenCalledWith("New Name");
    expect(mockUpdateCallInfo).toHaveBeenCalledWith({
      chatId,
      callInfo: { summaryName: "New Name" },
    });
  });

  it("blurring input disables renaming", () => {
    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counsellorId={counsellorId}
      />,
    );
    const input = screen.getByDisplayValue("Test Summary") as HTMLInputElement;
    fireEvent.blur(input);
    expect(input).toHaveClass("pointer-events-none");
  });

  it("does not show Edit button when canEditSummary is explicitly false", () => {
    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counsellorId={counsellorId}
        canEditSummary={false}
      />,
    );
    expect(screen.queryByText("EditIcon")).not.toBeInTheDocument();
  });

  it("does not show Edit button when user is not the counselor", () => {
    mockUseSelector.mockImplementation((fn: any) =>
      fn({
        user: {
          user: { role: "COUNSELLOR", userId: 2 },
          permissions: [Permissions.EDIT_CALL_DETAILS],
        },
      }),
    );

    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counsellorId={counsellorId}
      />,
    );
    expect(screen.queryByText("EditIcon")).not.toBeInTheDocument();
  });

  it("does not show Edit button when user lacks permission", () => {
    mockUseSelector.mockImplementation((fn: any) =>
      fn({
        user: {
          user: { role: "COUNSELLOR", userId: 1 },
          permissions: [],
        },
      }),
    );

    render(
      <SummaryHeader
        summaryName="Test Summary"
        setSummaryName={setSummaryName}
        chatId={chatId}
        counsellorId={counsellorId}
      />,
    );
    expect(screen.queryByText("EditIcon")).not.toBeInTheDocument();
  });
});
