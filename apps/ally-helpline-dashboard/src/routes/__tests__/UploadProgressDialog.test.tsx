import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useCancelAudioUploadMutation } from "@api";
import { RootState } from "@store";
import { AudioUpload, UploadStatus } from "@types";

import UploadProgressDialog from "../components/UploadProgressDialog";

// --- Mocks Setup ---

// Mock @api
const mockCancelAudioUpload = vi.fn();
vi.mock("@api", () => ({
  useCancelAudioUploadMutation: vi.fn(() => [mockCancelAudioUpload]),
}));

// Mock @assets
vi.mock("@assets", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    AudioFile: (props: any) => <svg data-testid="audio-file-icon" {...props} />,
    Close: (props: any) => <svg data-testid="close-icon" {...props} />,
    CrossRedBackground: (props: any) => <svg data-testid="cross-red-background-icon" {...props} />,
    TickGreenBackground: (props: any) => (
      <svg data-testid="tick-green-background-icon" {...props} />
    ),
  };
});

// Mock @components
vi.mock("@components", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    Button: ({ children, onClick, variant, ariaLabel, ...props }: any) => (
      <button
        data-testid="mock-button"
        onClick={onClick}
        data-variant={variant}
        aria-label={ariaLabel}
        {...props}
      >
        {children}
      </button>
    ),
    ButtonVariant: {
      ICON: "ICON",
      PRIMARY: "PRIMARY",
      SECONDARY: "SECONDARY",
    },
    ConfirmationDialog: ({
      isOpen,
      onClose,
      onButtonClick,
      onSecondaryButtonClick,
      title,
      content,
      buttonText,
      secondaryButtonText,
      ...props
    }: any) =>
      isOpen ? (
        <div data-testid="confirmation-dialog" {...props}>
          <div data-testid="dialog-title-normal">{title?.normal}</div>
          <div data-testid="dialog-title-italic">{title?.italic}</div>
          <div data-testid="dialog-content">{content}</div>
          <button data-testid="dialog-primary-button" onClick={onButtonClick}>
            {buttonText}
          </button>
          <button data-testid="dialog-secondary-button" onClick={onSecondaryButtonClick}>
            {secondaryButtonText}
          </button>
          <button data-testid="dialog-close-button" onClick={onClose}>
            Close
          </button>
        </div>
      ) : null,
  };
});

// Mock lucide-react
vi.mock("lucide-react", () => ({
  ChevronDown: (props: any) => <svg data-testid="chevron-down-icon" {...props} />,
  ChevronUp: (props: any) => <svg data-testid="chevron-up-icon" {...props} />,
  XCircle: (props: any) => <svg data-testid="x-circle-icon" {...props} />,
}));

// Mock @store - create dispatch mock inside factory
const mockStoreDispatch = vi.fn();
vi.mock("@store", async importOriginal => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    store: {
      dispatch: (...args: any[]) => mockStoreDispatch(...args),
    },
  };
});

// Mock @utils
vi.mock("@utils", () => ({
  getKeyFromIndex: (id: number, prefix: string) => `${prefix}-${id}`,
}));

// Mock @reducer
vi.mock("@reducer", () => ({
  clearAudioUploads: vi.fn(() => ({ type: "calls/clearAudioUploads" })),
  updateAudioUploadStatus: vi.fn((payload: any) => ({
    type: "calls/updateAudioUploadStatus",
    payload,
  })),
}));

// Mock getUploadHeader utility
vi.mock("../components/utils", async importOriginal => {
  // Import UploadStatus inside the factory to avoid hoisting issues
  const { UploadStatus } = await import("@types");
  return {
    getUploadHeader: (uploads: any[]) => {
      const inProgress = uploads.filter(u => u.status === UploadStatus.IN_PROGRESS).length;
      if (inProgress) return `${inProgress} upload${inProgress > 1 ? "s" : ""} in progress`;
      const cancelled = uploads.filter(u => u.status === UploadStatus.CANCELLED).length;
      if (cancelled) return `${cancelled} upload${cancelled > 1 ? "s" : ""} cancelled`;
      const completed = uploads.filter(u => u.status === UploadStatus.COMPLETED).length;
      if (completed) return `${completed} upload${completed > 1 ? "s" : ""} completed`;
      return "No uploads";
    },
  };
});

// --- Test Setup ---

const createMockStore = (initialState: Partial<RootState> = {}) => {
  return configureStore({
    reducer: {
      calls: (
        state = {
          audioUpload: [],
        },
        action: any,
      ) => {
        // Handle dispatched actions in test
        if (action.type === "calls/clearAudioUploads") {
          return { audioUpload: [] };
        }
        if (action.type === "calls/updateAudioUploadStatus") {
          const { chatId, status } = action.payload;
          return {
            audioUpload: (state.audioUpload || []).map((upload: AudioUpload) =>
              upload.chatId === chatId ? { ...upload, status } : upload,
            ),
          };
        }
        return state;
      },
    } as any,
    preloadedState: {
      calls: {
        audioUpload: initialState.calls?.audioUpload || [],
      },
    } as any,
  });
};

const mockUploads: AudioUpload[] = [
  {
    chatId: 1,
    fileName: "test1.mp3",
    status: UploadStatus.IN_PROGRESS,
    progress: 50,
    error: null,
  },
  {
    chatId: 2,
    fileName: "test2.mp3",
    status: UploadStatus.COMPLETED,
    progress: 100,
    error: null,
  },
  {
    chatId: 3,
    fileName: "test3.mp3",
    status: UploadStatus.FAILED,
    progress: 0,
    error: "Upload failed",
  },
];

const renderComponent = (uploads: AudioUpload[] = []) => {
  const store = createMockStore({
    calls: {
      audioUpload: uploads,
    },
  } as any);

  return render(
    <Provider store={store}>
      <UploadProgressDialog />
    </Provider>,
  );
};

describe("UploadProgressDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreDispatch.mockClear();
    mockCancelAudioUpload.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Snapshot Tests ---

  it("should match snapshot when fully rendered with uploads", () => {
    const { asFragment } = renderComponent(mockUploads);
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Rendering Tests ---

  it("should not render when uploads array is empty", () => {
    const { container } = renderComponent([]);
    expect(container.firstChild).toBeNull();
  });

  it("should render when uploads array has items", () => {
    renderComponent([mockUploads[0]]);
    expect(screen.getByText("1 upload in progress")).toBeInTheDocument();
  });

  it("should render the dialog container", () => {
    renderComponent([mockUploads[0]]);
    const container = screen.getByText("1 upload in progress").closest(".fixed");
    expect(container).toBeInTheDocument();
  });

  it("should render upload items when expanded", () => {
    renderComponent([mockUploads[0]]);
    expect(screen.getByText("test1.mp3")).toBeInTheDocument();
    expect(screen.getByTestId("audio-file-icon")).toBeInTheDocument();
  });

  it("should render progress circle for in-progress uploads", () => {
    renderComponent([mockUploads[0]]);
    const progressCircle = screen.getByLabelText("Progress 50%");
    expect(progressCircle).toBeInTheDocument();
  });

  it("should render completed icon for completed uploads", () => {
    renderComponent([mockUploads[1]]);
    expect(screen.getByTestId("tick-green-background-icon")).toBeInTheDocument();
  });

  it("should render failed icon for failed uploads", () => {
    renderComponent([mockUploads[2]]);
    expect(screen.getByTestId("x-circle-icon")).toBeInTheDocument();
  });

  it("should render cancelled text for cancelled uploads", () => {
    const cancelledUpload: AudioUpload = {
      chatId: 4,
      fileName: "test4.mp3",
      status: UploadStatus.CANCELLED,
      progress: 0,
      error: null,
    };
    renderComponent([cancelledUpload]);
    expect(screen.getByText("Upload cancelled")).toBeInTheDocument();
  });

  // --- Header Tests ---

  it("should display correct header for in-progress uploads", () => {
    renderComponent([mockUploads[0]]);
    expect(screen.getByText("1 upload in progress")).toBeInTheDocument();
  });

  it("should display correct header for multiple in-progress uploads", () => {
    const multipleUploads = [
      mockUploads[0],
      { ...mockUploads[0], chatId: 5, fileName: "test5.mp3" },
    ];
    renderComponent(multipleUploads);
    expect(screen.getByText("2 uploads in progress")).toBeInTheDocument();
  });

  it("should display correct header for completed uploads", () => {
    renderComponent([mockUploads[1]]);
    expect(screen.getByText("1 upload completed")).toBeInTheDocument();
  });

  it("should display correct header for cancelled uploads", () => {
    const cancelledUpload: AudioUpload = {
      chatId: 4,
      fileName: "test4.mp3",
      status: UploadStatus.CANCELLED,
      progress: 0,
      error: null,
    };
    renderComponent([cancelledUpload]);
    expect(screen.getByText("1 upload cancelled")).toBeInTheDocument();
  });

  // --- Sorting Tests ---

  it("should sort uploads with completed first", () => {
    const uploads = [
      mockUploads[0], // IN_PROGRESS
      mockUploads[1], // COMPLETED
      mockUploads[2], // FAILED
    ];
    renderComponent(uploads);
    const fileNames = screen.getAllByText(/test\d\.mp3/);
    // Completed should come first, then failed, then in progress
    expect(fileNames[0]).toHaveTextContent("test2.mp3"); // COMPLETED
  });

  it("should sort uploads correctly with multiple statuses", () => {
    const cancelledUpload: AudioUpload = {
      chatId: 4,
      fileName: "test4.mp3",
      status: UploadStatus.CANCELLED,
      progress: 0,
      error: null,
    };
    const uploads = [
      mockUploads[0], // IN_PROGRESS
      mockUploads[1], // COMPLETED
      mockUploads[2], // FAILED
      cancelledUpload, // CANCELLED
    ];
    renderComponent(uploads);
    const fileNames = screen.getAllByText(/test\d\.mp3/);
    // Order: COMPLETED, FAILED, CANCELLED, IN_PROGRESS
    expect(fileNames[0]).toHaveTextContent("test2.mp3"); // COMPLETED first
  });

  // --- Expansion/Collapse Tests ---

  it("should be expanded by default", () => {
    renderComponent([mockUploads[0]]);
    expect(screen.getByText("test1.mp3")).toBeInTheDocument();
    expect(screen.getByTestId("chevron-down-icon")).toBeInTheDocument();
  });

  it("should collapse when toggle button is clicked", () => {
    renderComponent([mockUploads[0]]);
    const toggleButton = screen.getByLabelText("Collapse");
    fireEvent.click(toggleButton);
    expect(screen.queryByText("test1.mp3")).not.toBeInTheDocument();
    expect(screen.getByTestId("chevron-up-icon")).toBeInTheDocument();
  });

  it("should expand when toggle button is clicked again", () => {
    renderComponent([mockUploads[0]]);
    const toggleButton = screen.getByLabelText("Collapse");
    fireEvent.click(toggleButton); // Collapse
    expect(screen.queryByText("test1.mp3")).not.toBeInTheDocument();

    const expandButton = screen.getByLabelText("Expand");
    fireEvent.click(expandButton); // Expand
    expect(screen.getByText("test1.mp3")).toBeInTheDocument();
  });

  // --- Interaction Tests ---

  it("should call cancelAudioUpload when cancel button is clicked on in-progress upload", () => {
    renderComponent([mockUploads[0]]);
    // Find the cancel button (CrossRedBackground) - it appears on hover
    const cancelIcon = screen.getByTestId("cross-red-background-icon");
    fireEvent.click(cancelIcon);

    expect(mockCancelAudioUpload).toHaveBeenCalledWith({ chatId: 1 });
    expect(mockStoreDispatch).toHaveBeenCalled();
  });

  it("should show confirmation dialog when close button is clicked with in-progress uploads", () => {
    renderComponent([mockUploads[0]]);
    const closeButton = screen.getByLabelText("Clear all");
    fireEvent.click(closeButton);

    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();
    expect(
      screen.getByText("Your upload is not complete. Would you like to cancel the upload?"),
    ).toBeInTheDocument();
  });

  it("should clear uploads when close button is clicked without in-progress uploads", () => {
    renderComponent([mockUploads[1]]); // COMPLETED
    const closeButton = screen.getByLabelText("Clear all");
    fireEvent.click(closeButton);

    expect(mockStoreDispatch).toHaveBeenCalled();
    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
  });

  it("should cancel all in-progress uploads when confirmed in dialog", () => {
    const uploads = [
      mockUploads[0], // IN_PROGRESS
      { ...mockUploads[0], chatId: 5, fileName: "test5.mp3" }, // IN_PROGRESS
      mockUploads[1], // COMPLETED - should not be cancelled
    ];
    renderComponent(uploads);
    const closeButton = screen.getByLabelText("Clear all");
    fireEvent.click(closeButton);

    const confirmButton = screen.getByTestId("dialog-primary-button");
    fireEvent.click(confirmButton);

    expect(mockCancelAudioUpload).toHaveBeenCalledTimes(2);
    expect(mockCancelAudioUpload).toHaveBeenCalledWith({ chatId: 1 });
    expect(mockCancelAudioUpload).toHaveBeenCalledWith({ chatId: 5 });
  });

  it("should close confirmation dialog when secondary button is clicked", () => {
    renderComponent([mockUploads[0]]);
    const closeButton = screen.getByLabelText("Clear all");
    fireEvent.click(closeButton);

    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();

    const continueButton = screen.getByTestId("dialog-secondary-button");
    fireEvent.click(continueButton);

    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
  });

  it("should close confirmation dialog when close button is clicked", () => {
    renderComponent([mockUploads[0]]);
    const closeButton = screen.getByLabelText("Clear all");
    fireEvent.click(closeButton);

    expect(screen.getByTestId("confirmation-dialog")).toBeInTheDocument();

    const dialogCloseButton = screen.getByTestId("dialog-close-button");
    fireEvent.click(dialogCloseButton);

    expect(screen.queryByTestId("confirmation-dialog")).not.toBeInTheDocument();
  });

  // --- Scroll Tests ---

  it("should apply scroll styles when more than 2 uploads", () => {
    const uploads = [mockUploads[0], mockUploads[1], mockUploads[2]];
    renderComponent(uploads);
    const scrollContainer = screen.getByText("test1.mp3").closest(".overflow-y-auto");
    expect(scrollContainer).toBeInTheDocument();
  });

  it("should not apply scroll styles when 2 or fewer uploads", () => {
    renderComponent([mockUploads[0], mockUploads[1]]);
    const container = screen.getByText("test1.mp3").closest(".px-4");
    expect(container).not.toHaveClass("max-h-[140px]");
  });

  // --- BeforeUnload Tests ---

  it("should add beforeunload event listener when uploads are in progress", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderComponent([mockUploads[0]]);

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("should not add beforeunload event listener when no uploads are in progress", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    renderComponent([mockUploads[1]]); // COMPLETED

    expect(addEventListenerSpy).not.toHaveBeenCalledWith("beforeunload", expect.any(Function));

    addEventListenerSpy.mockRestore();
  });

  // --- Edge Cases ---

  it("should handle multiple uploads with different statuses", () => {
    const uploads = [
      mockUploads[0], // IN_PROGRESS
      mockUploads[1], // COMPLETED
      mockUploads[2], // FAILED
    ];
    renderComponent(uploads);
    expect(screen.getByText("test1.mp3")).toBeInTheDocument();
    expect(screen.getByText("test2.mp3")).toBeInTheDocument();
    expect(screen.getByText("test3.mp3")).toBeInTheDocument();
  });

  it("should handle upload with 0% progress", () => {
    const upload: AudioUpload = {
      chatId: 6,
      fileName: "test6.mp3",
      status: UploadStatus.IN_PROGRESS,
      progress: 0,
      error: null,
    };
    renderComponent([upload]);
    const progressCircle = screen.getByLabelText("Progress 0%");
    expect(progressCircle).toBeInTheDocument();
  });

  it("should handle upload with 100% progress", () => {
    const upload: AudioUpload = {
      chatId: 7,
      fileName: "test7.mp3",
      status: UploadStatus.IN_PROGRESS,
      progress: 100,
      error: null,
    };
    renderComponent([upload]);
    const progressCircle = screen.getByLabelText("Progress 100%");
    expect(progressCircle).toBeInTheDocument();
  });

  it("should handle progress values outside 0-100 range", () => {
    const upload: AudioUpload = {
      chatId: 8,
      fileName: "test8.mp3",
      status: UploadStatus.IN_PROGRESS,
      progress: 150, // Should be clamped to 100
      error: null,
    };
    renderComponent([upload]);
    const progressCircle = screen.getByLabelText("Progress 100%");
    expect(progressCircle).toBeInTheDocument();
  });

  it("should handle negative progress values", () => {
    const upload: AudioUpload = {
      chatId: 9,
      fileName: "test9.mp3",
      status: UploadStatus.IN_PROGRESS,
      progress: -10, // Should be clamped to 0
      error: null,
    };
    renderComponent([upload]);
    const progressCircle = screen.getByLabelText("Progress 0%");
    expect(progressCircle).toBeInTheDocument();
  });
});
