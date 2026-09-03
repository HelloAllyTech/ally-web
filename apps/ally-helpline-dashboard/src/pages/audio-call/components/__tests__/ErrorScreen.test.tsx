import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { SocketDisconnectionReasons } from "@constants";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock Button component
vi.mock("@components", () => ({
  Button: ({ children, onClick, className, fullWidth, variant, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-full-width={fullWidth}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
  ButtonVariant: {
    SECONDARY: "secondary",
  },
}));

// Mock assets
vi.mock("@assets", () => ({
  ProgressLadderIcon: () => <svg data-testid="progress-ladder-icon" />,
  CharacterLibraryIcon: (props: any) => <svg {...props} data-testid="character-library-icon" />,
  ManageAccount: () => <svg data-testid="manage-account-icon" />,
  NoNetwork: ({ stroke, ...props }: any) => (
    <div data-testid="no-network-icon" data-stroke={stroke} {...props}>
      NoNetwork Icon
    </div>
  ),
  InDoubt: ({ stroke, ...props }: any) => (
    <div data-testid="in-doubt-icon" data-stroke={stroke} {...props}>
      InDoubt Icon
    </div>
  ),
  Carousel1: "Carousel1",
  Carousel2: "Carousel2",
  Carousel3: "Carousel3",
  Carousel4: "Carousel4",
  EndSessionIllustration: "EndSessionIllustration",
  NoResults: "NoResults",
  Focus: "Focus",
  PauseIcon: "PauseIcon",
  Warning: "Warning",
  Lock: "Lock",
  Enhance: "Enhance",
  Mindfulness: "Mindfulness",
  Flower: "Flower",
  LoginImage: "LoginImage",
  DefaultCallProfile: "DefaultCallProfile",
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

// Mock the utils module with a simple implementation
vi.mock("./utils", () => ({
  getContentByDisconnectionReason: vi.fn(reason => {
    // Handle null/undefined cases
    if (!reason) {
      return null;
    }

    switch (reason) {
      case SocketDisconnectionReasons.NO_NETWORK:
        return {
          icon: "NoNetwork",
          title: "No internet connection",
          description:
            "Call ended due to network interruption, please check your connection and try again.",
        };
      case SocketDisconnectionReasons.NO_NETWORK_IN_SHARED_SESSION:
        return {
          icon: "NoNetwork",
          title: "No internet connection",
          description: "Please check your connection and try again.",
        };
      case SocketDisconnectionReasons.SOMETHING_WENT_WRONG:
        return {
          icon: "InDoubt",
          title: "Something went wrong",
          description: "Call ended due to unknown reason, please try again..",
        };
      default:
        // Always return a valid object for any other case
        return {
          icon: "InDoubt",
          title: "Unknown Error",
          description: "An unknown error occurred.",
        };
    }
  }),
}));

// Import ErrorScreen after mocking
import ErrorScreen from "../ErrorScreen";

// Mock window methods
const mockHistoryBack = vi.fn();
const mockLocationReload = vi.fn();

Object.defineProperty(window, "history", {
  value: {
    back: mockHistoryBack,
  },
  writable: true,
});

Object.defineProperty(window, "location", {
  value: {
    reload: mockLocationReload,
  },
  writable: true,
});

const renderComponent = (socketDisconnectionReason: SocketDisconnectionReasons | null) => {
  return render(<ErrorScreen socketDisconnectionReason={socketDisconnectionReason} />);
};

describe("ErrorScreen Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should not render when socketDisconnectionReason is null", () => {
      const { container } = renderComponent(null);
      expect(container.firstChild).toBeNull();
    });

    it("should not render when socketDisconnectionReason is undefined", () => {
      const { container } = renderComponent(undefined as any);
      expect(container.firstChild).toBeNull();
    });

    it("should render with no network error", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      expect(screen.getByText("No internet connection")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Call ended due to network interruption, please check your connection and try again.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Go back")).toBeInTheDocument();
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    it("should render with no network in shared session error", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK_IN_SHARED_SESSION);

      expect(screen.getByText("No internet connection")).toBeInTheDocument();
      expect(screen.getByText("Please check your connection and try again.")).toBeInTheDocument();
    });

    it("should render with something went wrong error", () => {
      renderComponent(SocketDisconnectionReasons.SOMETHING_WENT_WRONG);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(
        screen.getByText("Call ended due to unknown reason, please try again.."),
      ).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should call window.history.back() when Go back button is clicked", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const goBackButton = screen.getByText("Go back");
      fireEvent.click(goBackButton);

      expect(mockHistoryBack).toHaveBeenCalledTimes(1);
    });

    it("should call window.location.reload() when Try again button is clicked", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const tryAgainButton = screen.getByText("Try again");
      fireEvent.click(tryAgainButton);

      expect(mockLocationReload).toHaveBeenCalledTimes(1);
    });
  });

  describe("Button Properties", () => {
    it("should render Go back button with correct properties", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const goBackButton = screen.getByText("Go back");
      expect(goBackButton).toHaveAttribute("data-variant", "secondary");
      expect(goBackButton).toHaveAttribute("data-full-width", "true");
      expect(goBackButton).toHaveClass("text-white");
    });

    it("should render Try again button with correct properties", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const tryAgainButton = screen.getByText("Try again");
      expect(tryAgainButton).toHaveAttribute("data-full-width", "true");
    });
  });

  describe("Icon Rendering", () => {
    it("should render NoNetwork icon for network errors", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const icon = screen.getByTestId("no-network-icon");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("data-stroke", "#fff");
    });

    it("should render InDoubt icon for something went wrong error", () => {
      renderComponent(SocketDisconnectionReasons.SOMETHING_WENT_WRONG);

      const icon = screen.getByTestId("in-doubt-icon");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("data-stroke", "#fff");
    });
  });

  describe("Component Structure", () => {
    it("should have correct CSS classes", () => {
      const { container } = renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass(
        "flex",
        "flex-col",
        "justify-center",
        "items-center",
        "gap-4",
        "w-80",
      );
    });

    it("should have correct title styling", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const title = screen.getByText("No internet connection");
      expect(title).toHaveClass("text-white", "text-2xl", "text-center", "mt-1", "font-secondary");
    });

    it("should have correct description styling", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const description = screen.getByText(
        "Call ended due to network interruption, please check your connection and try again.",
      );
      expect(description).toHaveClass(
        "text-white",
        "text-sm",
        "text-center",
        "mt-1",
        "font-primary",
      );
    });

    it("should have correct button container styling", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const buttonContainer = screen.getByText("Go back").closest("div");
      expect(buttonContainer).toHaveClass(
        "w-full",
        "text-center",
        "flex",
        "justify-center",
        "items-center",
        "gap-4",
        "mt-1",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string as socketDisconnectionReason", () => {
      const { container } = renderComponent("" as any);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible buttons", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      const goBackButton = screen.getByText("Go back");
      const tryAgainButton = screen.getByText("Try again");

      expect(goBackButton).toBeInTheDocument();
      expect(tryAgainButton).toBeInTheDocument();
    });

    it("should have proper text content for screen readers", () => {
      renderComponent(SocketDisconnectionReasons.NO_NETWORK);

      expect(screen.getByText("No internet connection")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Call ended due to network interruption, please check your connection and try again.",
        ),
      ).toBeInTheDocument();
    });
  });
});
