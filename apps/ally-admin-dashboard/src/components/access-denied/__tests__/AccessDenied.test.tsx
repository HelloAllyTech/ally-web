import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { AccessDenied } from "../AccessDenied";

// Mock constants
vi.mock("@constants", () => ({
  en: {
    accessDenied: {
      title: "Access Denied",
      message: "You do not have permission to access this resource.",
    },
    common: {
      goBack: "Go Back",
    },
  },
}));

describe("AccessDenied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders with default title and message", () => {
      render(<AccessDenied />);

      expect(screen.getByText("Access Denied")).toBeInTheDocument();
      expect(
        screen.getByText("You do not have permission to access this resource."),
      ).toBeInTheDocument();
    });

    it("renders with custom title", () => {
      render(<AccessDenied title="Custom Access Denied" />);

      expect(screen.getByText("Custom Access Denied")).toBeInTheDocument();
    });

    it("renders with custom message", () => {
      render(<AccessDenied message="Custom error message" />);

      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });

    it("renders with both custom title and message", () => {
      render(<AccessDenied title="Custom Title" message="Custom Message" />);

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
      expect(screen.getByText("Custom Message")).toBeInTheDocument();
    });

    it("does not render back button by default", () => {
      render(<AccessDenied />);

      expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
    });

    it("renders back button when showBackButton is true", () => {
      render(<AccessDenied showBackButton={true} />);

      expect(screen.getByText("Go Back")).toBeInTheDocument();
    });
  });

  describe("Back Button Functionality", () => {
    it("calls handleGoBack when back button is clicked", () => {
      const mockHandleGoBack = vi.fn();
      render(<AccessDenied showBackButton={true} handleGoBack={mockHandleGoBack} />);

      const backButton = screen.getByText("Go Back");
      fireEvent.click(backButton);

      expect(mockHandleGoBack).toHaveBeenCalledTimes(1);
    });

    it("does not call handleGoBack when button is not shown", () => {
      const mockHandleGoBack = vi.fn();
      render(<AccessDenied showBackButton={false} handleGoBack={mockHandleGoBack} />);

      expect(mockHandleGoBack).not.toHaveBeenCalled();
    });

    it("back button has correct styling", () => {
      render(<AccessDenied showBackButton={true} />);

      const backButton = screen.getByText("Go Back");
      expect(backButton).toHaveClass("rounded-lg");
    });
  });

  describe("Styling and Layout", () => {
    it("applies default className", () => {
      const { container } = render(<AccessDenied />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("flex");
      expect(wrapper).toHaveClass("flex-col");
      expect(wrapper).toHaveClass("items-center");
      expect(wrapper).toHaveClass("justify-center");
    });

    it("applies custom className", () => {
      const { container } = render(<AccessDenied className="custom-class" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("has minimum height", () => {
      const { container } = render(<AccessDenied />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("min-h-[500px]");
    });

    it("title has correct styling", () => {
      render(<AccessDenied />);

      const title = screen.getByText("Access Denied");
      expect(title).toHaveClass("font-medium");
      expect(title).toHaveClass("text-center");
    });

    it("message has correct styling", () => {
      render(<AccessDenied />);

      const message = screen.getByText("You do not have permission to access this resource.");
      expect(message).toHaveClass("text-center");
      expect(message).toHaveClass("max-w-md");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty title", () => {
      render(<AccessDenied title="" />);

      const titleElement = screen.queryByRole("heading");
      expect(titleElement).toBeInTheDocument();
    });

    it("handles empty message", () => {
      render(<AccessDenied message="" />);

      const { container } = render(<AccessDenied message="" />);
      expect(container).toBeInTheDocument();
    });

    it("handles long title", () => {
      const longTitle = "This is a very long title that should still render correctly";
      render(<AccessDenied title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it("handles long message", () => {
      const longMessage =
        "This is a very long message that should still render correctly and be centered on the page with proper styling applied.";
      render(<AccessDenied message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it("handles undefined handleGoBack", () => {
      render(<AccessDenied showBackButton={true} handleGoBack={undefined} />);

      const backButton = screen.getByText("Go Back");
      expect(() => fireEvent.click(backButton)).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("title is rendered as h1", () => {
      render(<AccessDenied />);

      const title = screen.getByRole("heading", { level: 1 });
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Access Denied");
    });

    it("message is rendered as paragraph", () => {
      render(<AccessDenied />);

      const message = screen.getByText("You do not have permission to access this resource.");
      expect(message.tagName).toBe("P");
    });

    it("back button is a button element", () => {
      render(<AccessDenied showBackButton={true} />);

      const backButton = screen.getByText("Go Back");
      expect(backButton.tagName).toBe("BUTTON");
    });

    it("back button is keyboard accessible", () => {
      const mockHandleGoBack = vi.fn();
      render(<AccessDenied showBackButton={true} handleGoBack={mockHandleGoBack} />);

      const backButton = screen.getByText("Go Back");
      backButton.focus();
      expect(document.activeElement).toBe(backButton);
    });
  });

  describe("Component Structure", () => {
    it("renders title before message", () => {
      const { container } = render(<AccessDenied />);

      const elements = container.querySelectorAll("h1, p");
      expect(elements[0].tagName).toBe("H1");
      expect(elements[1].tagName).toBe("P");
    });

    it("renders message before button", () => {
      render(<AccessDenied showBackButton={true} />);

      const message = screen.getByText("You do not have permission to access this resource.");
      const button = screen.getByText("Go Back");

      const messagePosition = message.compareDocumentPosition(button);
      expect(messagePosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("button container has correct gap", () => {
      const { container } = render(<AccessDenied showBackButton={true} />);

      const buttonContainer = container.querySelector(".gap-3");
      expect(buttonContainer).toBeInTheDocument();
    });
  });
});
