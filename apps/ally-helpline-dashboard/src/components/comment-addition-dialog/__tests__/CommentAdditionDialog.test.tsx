import React from "react";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import CommentAdditionDialog from "../CommentAdditionDialog";

// Mock react-redux
const mockUser = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
};

vi.mock("react-redux", () => ({
  useSelector: vi.fn(selector =>
    selector({
      user: { user: mockUser },
    }),
  ),
}));

// Mock AutoExpandableTextarea and CustomImage
vi.mock("@ally-ui-mono/ui-shared/index", () => ({
  AutoExpandableTextarea: ({ value, onChange, placeholder, className }: any) => (
    <textarea
      data-testid="comment-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  ),
  CustomImage: ({ src, alt, className, fallbackText, fallbackClassName }: any) => (
    <div className={fallbackClassName} data-testid="custom-image">
      {fallbackText}
    </div>
  ),
}));

// Mock Button component
vi.mock("../../button", () => ({
  Button: ({ children, onClick, variant, className }: any) => (
    <button
      data-testid={`button-${variant}`}
      onClick={onClick}
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

describe("CommentAdditionDialog Component", () => {
  const mockOnCancel = vi.fn();
  const mockOnComment = vi.fn();

  const defaultProps = {
    onCancel: mockOnCancel,
    onComment: mockOnComment,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Snapshot Tests ---
  it("should match snapshot when rendered", () => {
    const { asFragment } = render(<CommentAdditionDialog {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  // --- Basic Rendering Tests ---
  describe("Basic Rendering", () => {
    it("should render user initials", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("should render user name", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("should render comment textarea with placeholder", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute("placeholder", "Add Comment");
    });

    it("should render Cancel button", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should render Comment button", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      expect(screen.getByText("Comment")).toBeInTheDocument();
    });
  });

  // --- User Initials Tests ---
  describe("User Initials", () => {
    it("should display first letter of user name", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const initialsContainer = screen.getByText("J");
      expect(initialsContainer).toBeInTheDocument();
    });

    it("should display initials in a circular container", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const initialsContainer = screen.getByText("J");
      expect(initialsContainer).toHaveClass("rounded-full");
    });

    it("should have correct styling on initials container", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const initialsContainer = container.querySelector(".w-8.h-8.rounded-full.border");
      expect(initialsContainer).toBeInTheDocument();
      expect(initialsContainer).toHaveClass("w-8", "h-8", "border", "rounded-full");
    });
  });

  // --- Textarea Tests ---
  describe("Textarea Functionality", () => {
    it("should have empty initial value", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      expect(textarea).toHaveValue("");
    });

    it("should update value when typing", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");

      fireEvent.change(textarea, { target: { value: "This is a test comment" } });
      expect(textarea).toHaveValue("This is a test comment");
    });

    it("should maintain value during continuous typing", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");

      fireEvent.change(textarea, { target: { value: "H" } });
      expect(textarea).toHaveValue("H");

      fireEvent.change(textarea, { target: { value: "He" } });
      expect(textarea).toHaveValue("He");

      fireEvent.change(textarea, { target: { value: "Hello" } });
      expect(textarea).toHaveValue("Hello");
    });
  });

  // --- Button Tests ---
  describe("Button Functionality", () => {
    it("should call onCancel when Cancel button is clicked", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const cancelButton = screen.getByText("Cancel");

      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("should call onComment with empty string when Comment clicked without typing", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const commentButton = screen.getByText("Comment");

      fireEvent.click(commentButton);
      expect(mockOnComment).toHaveBeenCalledWith("");
    });

    it("should call onComment with comment text when Comment clicked after typing", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      const commentButton = screen.getByText("Comment");

      fireEvent.change(textarea, { target: { value: "My test comment" } });
      fireEvent.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledWith("My test comment");
    });

    it("should have secondary variant on Cancel button", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const cancelButton = screen.getByTestId("button-secondary");
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toHaveAttribute("data-variant", "secondary");
    });

    it("should have primary variant on Comment button", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const commentButton = screen.getByTestId("button-primary");
      expect(commentButton).toBeInTheDocument();
      expect(commentButton).toHaveAttribute("data-variant", "primary");
    });
  });

  // --- Styling Tests ---
  describe("Styling", () => {
    it("should have white background", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("bg-white");
    });

    it("should have rounded corners", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("rounded-lg");
    });

    it("should have shadow", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("shadow-lg");
    });

    it("should have border", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("border");
    });

    it("should have fixed width of 360px", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("w-[360px]");
    });

    it("should have padding", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("p-4");
    });

    it("should have font-primary on header section", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const headerSection = container.querySelector(".font-primary");
      expect(headerSection).toBeInTheDocument();
    });
  });

  // --- Button Grid Layout Tests ---
  describe("Button Grid Layout", () => {
    it("should render buttons in a grid layout", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const buttonGrid = container.querySelector(".grid-cols-2");
      expect(buttonGrid).toBeInTheDocument();
    });

    it("should have Cancel button with col-span-1", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const cancelButton = screen.getByTestId("button-secondary");
      expect(cancelButton).toHaveClass("col-span-1");
    });

    it("should have Comment button with col-span-1", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const commentButton = screen.getByTestId("button-primary");
      expect(commentButton).toHaveClass("col-span-1");
    });
  });

  // --- Edge Cases ---
  describe("Edge Cases", () => {
    it("should handle special characters in comment", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      const commentButton = screen.getByText("Comment");

      const specialChars = '<script>alert("xss")</script> & < > " \'';
      fireEvent.change(textarea, { target: { value: specialChars } });
      fireEvent.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledWith(specialChars);
    });

    it("should handle emojis in comment", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      const commentButton = screen.getByText("Comment");

      const emojiComment = "Great work! 👍🎉🚀";
      fireEvent.change(textarea, { target: { value: emojiComment } });
      fireEvent.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledWith(emojiComment);
    });

    it("should handle very long comments", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      const commentButton = screen.getByText("Comment");

      const longComment = "A".repeat(1000);
      fireEvent.change(textarea, { target: { value: longComment } });
      fireEvent.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledWith(longComment);
    });

    it("should handle whitespace-only comments", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      const commentButton = screen.getByText("Comment");

      fireEvent.change(textarea, { target: { value: "   " } });
      fireEvent.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledWith("   ");
    });

    it("should handle multiline comments", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      const commentButton = screen.getByText("Comment");

      const multilineComment = "Line 1\nLine 2\nLine 3";
      fireEvent.change(textarea, { target: { value: multilineComment } });
      fireEvent.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledWith(multilineComment);
    });
  });

  // --- Multiple Actions Tests ---
  describe("Multiple Actions", () => {
    it("should allow canceling after typing", async () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      const cancelButton = screen.getByText("Cancel");

      fireEvent.change(textarea, { target: { value: "Draft comment" } });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnComment).not.toHaveBeenCalled();
    });

    it("should handle multiple Comment button clicks", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");
      const commentButton = screen.getByText("Comment");

      fireEvent.change(textarea, { target: { value: "Test" } });
      fireEvent.click(commentButton);
      fireEvent.click(commentButton);
      fireEvent.click(commentButton);

      expect(mockOnComment).toHaveBeenCalledTimes(3);
    });

    it("should handle multiple Cancel button clicks", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const cancelButton = screen.getByText("Cancel");

      fireEvent.click(cancelButton);
      fireEvent.click(cancelButton);
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(3);
    });
  });

  // --- Textarea State Isolation ---
  describe("Textarea State Isolation", () => {
    it("should not persist value between renders", () => {
      const { unmount } = render(<CommentAdditionDialog {...defaultProps} />);
      const textarea = screen.getByTestId("comment-textarea");

      fireEvent.change(textarea, { target: { value: "Test comment" } });
      expect(textarea).toHaveValue("Test comment");

      unmount();

      render(<CommentAdditionDialog {...defaultProps} />);
      const newTextarea = screen.getByTestId("comment-textarea");
      expect(newTextarea).toHaveValue("");
    });
  });

  // --- User Info Display Tests ---
  describe("User Info Display", () => {
    it("should display user info in flex container", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const userInfoContainer = container.querySelector(".flex.items-center.gap-2");
      expect(userInfoContainer).toBeInTheDocument();
    });

    it("should display user name with correct styling", () => {
      render(<CommentAdditionDialog {...defaultProps} />);
      const userName = screen.getByText("John Doe");
      expect(userName).toHaveClass("text-sm", "font-medium");
    });
  });

  // --- Flex Layout Tests ---
  describe("Flex Layout", () => {
    it("should have flex column layout on main content", () => {
      const { container } = render(<CommentAdditionDialog {...defaultProps} />);
      const flexCol = container.querySelector(".flex.flex-col.gap-4");
      expect(flexCol).toBeInTheDocument();
    });
  });
});
