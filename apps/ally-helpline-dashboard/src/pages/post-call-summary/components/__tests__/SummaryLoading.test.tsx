import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ChatSummaryStatus, Permissions } from "@types";

import SummaryLoading from "../SummaryLoading";

// Mock react-redux
const mockUseSelector = vi.fn();
vi.mock("react-redux", () => ({
  useSelector: (callback: any) => mockUseSelector(callback),
}));

// Mock @ally-ui-mono/ui-shared (Carbon). SummaryLoading now uses the shared
// `Loading` (replacing MUI CircularProgress) and `Tooltip` (whose content comes
// from a `label` prop, not MUI's `title`).
vi.mock("@ally-ui-mono/ui-shared", () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
  Tooltip: ({ children, label }: any) => (
    <div data-testid="tooltip" data-title={label}>
      {children}
    </div>
  ),
  TextArea: ({ labelText, hideLabel, ...props }: any) => (
    <textarea aria-label={labelText} {...props} />
  ),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Check: (props: any) => <svg data-testid="check-icon" {...props} />,
  Info: (props: any) => <svg data-testid="info-icon" {...props} />,
  CircleX: (props: any) => <svg data-testid="circle-x-icon" {...props} />,
}));

// Mock @assets
vi.mock("@assets", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    SummaryGenenerationVideo: "video-path.mp4",
  };
});

// Mock @assets/icons
vi.mock("@assets/icons", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    NotesIcon: () => <svg data-testid="notes-icon" />,
    VerifiedBadge: ({ className }: any) => (
      <svg data-testid="verified-badge-icon" className={className} />
    ),
    Cloud: () => <svg data-testid="cloud-icon" />,
    SummaryGeneratedIllustration: ({ className }: any) => (
      <svg data-testid="summary-generated-illustration" className={className} />
    ),
    SummaryFailed: ({ className }: any) => (
      <svg data-testid="summary-failed-icon" className={className} />
    ),
  };
});

// Mock @components
vi.mock("@components", () => ({
  Button: ({ children, onClick, variant, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
  ButtonVariant: {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    TEXT: "text",
  },
  InfoBanner: ({ message, icon, wrapperClassName, messageClassName }: any) => (
    <div
      data-testid="info-banner"
      className={wrapperClassName}
      data-message-class={messageClassName}
    >
      {icon && <div data-testid="info-banner-icon">{icon()}</div>}
      <span>{message}</span>
    </div>
  ),
  ShinyText: ({ text, className }: any) => (
    <div data-testid="shiny-text" className={className}>
      {text}
    </div>
  ),
}));

// Mock @constants
vi.mock("@constants", () => ({
  Permissions: {
    EDIT_CALL_DETAILS: "EDIT_CALL_DETAILS",
  },
  SESSION_STORAGE_KEYS: {
    TRANSCRIPTION_GENERATION_VIDEO_SEEN: "transcription_generation_video_seen",
  },
  TOOLTIP_DARK_PROPS: {
    tooltip: {
      sx: {},
    },
  },
}));

// Mock constants
vi.mock("../constants", () => ({
  PostCallProcessingMessages: [
    "Generating transcription",
    "Deleting audio",
    "Segregating utterances",
    "Understanding conversation",
    "Charting flow",
    "Extracting key points",
    "Identifying themes",
    "Analysing",
    "Generating summary",
    "Enriching summary",
    "Validating summary",
  ],
  SUMMARY_GENERATION_START_INDEX: 8,
}));

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

describe("SummaryLoading", () => {
  const mockOnViewCallLogs = vi.fn();
  const mockRefetchSummary = vi.fn();
  const mockOnNotesChange = vi.fn();

  const defaultProps = {
    summaryStatus: ChatSummaryStatus.IN_PROGRESS,
    onViewCallLogs: mockOnViewCallLogs,
    refetchSummary: mockRefetchSummary,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseSelector.mockReturnValue({
      permissions: [],
    });
    sessionStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderComponent = (props: Partial<typeof defaultProps> = {}) => {
    return render(<SummaryLoading {...defaultProps} {...props} />);
  };

  // --- Snapshot Tests ---

  it("should match snapshot when IN_PROGRESS", () => {
    const { asFragment } = renderComponent({ summaryStatus: ChatSummaryStatus.IN_PROGRESS });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when SUCCESS", () => {
    const { asFragment } = renderComponent({ summaryStatus: ChatSummaryStatus.SUCCESS });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when FAILED", () => {
    const { asFragment } = renderComponent({ summaryStatus: ChatSummaryStatus.FAILED });
    expect(asFragment()).toMatchSnapshot();
  });

  it("should match snapshot when NO_AUDIO", () => {
    const { asFragment } = renderComponent({ summaryStatus: ChatSummaryStatus.NO_AUDIO });
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests (SUCCESS State) ---

  it("should render SUCCESS state correctly", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.SUCCESS });
    expect(screen.getByTestId("summary-generated-illustration")).toBeInTheDocument();
    expect(screen.getByText("Summary is generated")).toBeInTheDocument();
    expect(screen.getByText("You can review the session now.")).toBeInTheDocument();
  });

  it("should render disabled button with progress indicator in SUCCESS state", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.SUCCESS });
    const button = screen.getByText(/Setting up your summary screen/i);
    expect(button).toBeDisabled();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  // --- Rendering Tests (IN_PROGRESS/PENDING State) ---

  it("should render IN_PROGRESS state correctly", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.IN_PROGRESS });
    expect(screen.getByText("Generating transcription")).toBeInTheDocument();
    expect(screen.getByTestId("shiny-text")).toBeInTheDocument();
  });

  it("should not show info banner initially in IN_PROGRESS state", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.IN_PROGRESS });
    expect(screen.queryByTestId("info-banner")).not.toBeInTheDocument();
  });

  it("should render estimated time when provided", () => {
    renderComponent({
      summaryStatus: ChatSummaryStatus.IN_PROGRESS,
      estimatedTime: 5,
    });
    expect(screen.getByText("Estimated time: ~ 5 min")).toBeInTheDocument();
  });

  it("should not render 'I'll check later' button when inSummarySidebar is true", () => {
    renderComponent({
      summaryStatus: ChatSummaryStatus.IN_PROGRESS,
      inSummarySidebar: true,
    });
    expect(screen.queryByText("I'll check later")).not.toBeInTheDocument();
    expect(screen.getByText("See if its ready")).toBeInTheDocument();
  });

  // --- Rendering Tests (FAILED State) ---

  it("should render FAILED state correctly", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.FAILED });
    expect(screen.getByTestId("summary-failed-icon")).toBeInTheDocument();
    expect(screen.getByText("Failed to generate session summary")).toBeInTheDocument();
  });

  it("should render 'Back to session logs' button in FAILED state when not in sidebar", () => {
    renderComponent({
      summaryStatus: ChatSummaryStatus.FAILED,
      inSummarySidebar: false,
    });
    expect(screen.getByText("Back to session logs")).toBeInTheDocument();
  });

  it("should not render 'Back to session logs' button in FAILED state when inSummarySidebar is true", () => {
    renderComponent({
      summaryStatus: ChatSummaryStatus.FAILED,
      inSummarySidebar: true,
    });
    expect(screen.queryByText("Back to session logs")).not.toBeInTheDocument();
  });

  // --- Rendering Tests (NO_AUDIO State) ---

  it("should render NO_AUDIO state correctly with extra message", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.NO_AUDIO });
    expect(screen.getByTestId("summary-failed-icon")).toBeInTheDocument();
    expect(screen.getByText("Failed to generate session summary")).toBeInTheDocument();
    expect(screen.getByText("No audio detected")).toBeInTheDocument();
    expect(screen.getByTestId("circle-x-icon")).toBeInTheDocument();
  });

  // --- Notes Section Tests ---

  it("should render notes section", () => {
    renderComponent();
    expect(screen.getByTestId("notes-icon")).toBeInTheDocument();
    expect(screen.getByText("Add Notes (optional)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("write down your thoughts")).toBeInTheDocument();
  });

  it("should call onNotesChange when notes textarea value changes", () => {
    renderComponent({ onNotesChange: mockOnNotesChange });
    const textarea = screen.getByPlaceholderText("write down your thoughts");
    fireEvent.change(textarea, { target: { value: "Test notes" } });
    expect(mockOnNotesChange).toHaveBeenCalledWith("Test notes");
  });

  it("should disable textarea when user does not have EDIT_CALL_DETAILS permission", () => {
    mockUseSelector.mockReturnValue({
      permissions: [],
    });
    renderComponent();
    const textarea = screen.getByPlaceholderText("write down your thoughts");
    expect(textarea).toBeDisabled();
  });

  it("should display 'Autosaving' when isNotesSaving is true", () => {
    renderComponent({ isNotesSaving: true });
    expect(screen.getByText("Autosaving")).toBeInTheDocument();
    expect(screen.getByTestId("cloud-icon")).toBeInTheDocument();
  });

  it("should display 'Saved' when notes exist and isNotesSaving is false", () => {
    renderComponent({ notes: "Test notes", isNotesSaving: false });
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("should display saved notes value in textarea", () => {
    renderComponent({ notes: "Existing notes" });
    const textarea = screen.getByPlaceholderText("write down your thoughts");
    expect(textarea).toHaveValue("Existing notes");
  });

  it("should render tooltip for notes section", () => {
    renderComponent();
    const tooltip = screen.getByTestId("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute(
      "data-title",
      "Your notes are saved automatically and will appear under “Additional Notes” after the summary is created.",
    );
  });

  // --- Interaction Tests ---

  it("should call refetchSummary when 'See if its ready' button is clicked", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.IN_PROGRESS });
    const button = screen.getByText("See if its ready");
    fireEvent.click(button);
    expect(mockRefetchSummary).toHaveBeenCalledTimes(1);
  });

  it("should call onViewCallLogs when 'Back to session logs' button is clicked", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.FAILED });
    const button = screen.getByText("Back to session logs");
    fireEvent.click(button);
    expect(mockOnViewCallLogs).toHaveBeenCalledTimes(1);
  });

  it("should start from SUMMARY_GENERATION_START_INDEX if video was already seen", () => {
    sessionStorageMock.getItem.mockReturnValue("true");
    renderComponent({
      summaryStatus: ChatSummaryStatus.IN_PROGRESS,
      inSummarySidebar: false,
    });

    // Should start at index 8 (Generating summary)
    expect(screen.getByText("Generating summary")).toBeInTheDocument();
  });

  it("should always start from SUMMARY_GENERATION_START_INDEX when inSummarySidebar is true", () => {
    renderComponent({
      summaryStatus: ChatSummaryStatus.IN_PROGRESS,
      inSummarySidebar: true,
    });

    // Should start at index 8 (Generating summary)
    expect(screen.getByText("Generating summary")).toBeInTheDocument();
  });

  // --- PENDING State Tests ---

  it("should render PENDING state similar to IN_PROGRESS", () => {
    renderComponent({ summaryStatus: ChatSummaryStatus.PENDING });
    expect(screen.getByTestId("shiny-text")).toBeInTheDocument();
    expect(screen.getByText("See if its ready")).toBeInTheDocument();
  });

  // --- Text Content Tests ---

  it("should display different message for inSummarySidebar in IN_PROGRESS state", () => {
    renderComponent({
      summaryStatus: ChatSummaryStatus.IN_PROGRESS,
      inSummarySidebar: true,
    });
    expect(
      screen.getByText(
        "An AI-generated summary will be available shortly on this screen. In the meantime, you can add notes below.",
      ),
    ).toBeInTheDocument();
  });

  it("should display different message when not inSummarySidebar in IN_PROGRESS state", () => {
    renderComponent({
      summaryStatus: ChatSummaryStatus.IN_PROGRESS,
      inSummarySidebar: false,
    });
    expect(
      screen.getByText(
        "An AI-generated summary will be available shortly on this screen and in the session logs. In the meantime, you can add notes below.",
      ),
    ).toBeInTheDocument();
  });
});
