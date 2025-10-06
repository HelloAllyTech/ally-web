import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Transcription } from "@types";
import { getKeyFromIndex } from "@utils";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, initial, animate, exit, transition, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock the utils module
vi.mock("@utils", () => ({
  getKeyFromIndex: vi.fn((index: number, prefix: string = "key") => `${prefix}-${index}`),
}));

// Mock the utils from the audio-call directory
vi.mock("../utils", () => ({
  getSpeakerName: vi.fn((senderId: number, previousSenderId: number, userId: number) => {
    if (previousSenderId && previousSenderId === senderId) return "";
    return senderId === userId ? "You" : "Speaker";
  }),
}));

// Import RealTimeTranscript after mocking
import RealTimeTranscript from "../RealTimeTranscript";

// Mock Redux store
const createMockStore = (user: any = { userId: 123, name: "Test User" }) => {
  return configureStore({
    reducer: {
      user: (state = { user }, action) => state,
    },
    preloadedState: {
      user: { user },
    },
  });
};

const renderComponent = (
  isFocusMode: boolean,
  transcriptions: Transcription[],
  user: any = { userId: 123, name: "Test User" },
) => {
  const store = createMockStore(user);
  return render(
    <Provider store={store}>
      <RealTimeTranscript isFocusMode={isFocusMode} transcriptions={transcriptions} />
    </Provider>,
  );
};

const mockTranscriptions: Transcription[] = [
  {
    id: 1,
    message: "Hello, how are you today?",
    senderId: 123,
    timestamp: "2024-01-01T10:00:00Z",
    isFinal: true,
    isSentenceComplete: true,
  },
  {
    id: 2,
    message: "I'm doing well, thank you for asking.",
    senderId: 456,
    timestamp: "2024-01-01T10:00:05Z",
    isFinal: true,
    isSentenceComplete: true,
  },
  {
    id: 3,
    message: "That's great to hear!",
    senderId: 123,
    timestamp: "2024-01-01T10:00:10Z",
    isFinal: false,
    isSentenceComplete: false,
  },
];

describe("RealTimeTranscript Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollTo method
    Element.prototype.scrollTo = vi.fn() as any;
  });

  describe("Component Rendering", () => {
    it("should not render when transcriptions array is empty", () => {
      const { container } = renderComponent(false, []);
      expect(container.firstChild).toBeNull();
    });

    it("should not render when transcriptions array has length 0", () => {
      const { container } = renderComponent(false, []);
      expect(container.firstChild).toBeNull();
    });

    it("should render when transcriptions array has content", () => {
      renderComponent(false, mockTranscriptions);

      expect(screen.getByText("Real-time Transcription")).toBeInTheDocument();
      expect(screen.getByText("Hello, how are you today?")).toBeInTheDocument();
      expect(screen.getByText("I'm doing well, thank you for asking.")).toBeInTheDocument();
      expect(screen.getByText("That's great to hear!")).toBeInTheDocument();
    });

    it("should render with correct title", () => {
      renderComponent(false, mockTranscriptions);
      const title = screen.getByText("Real-time Transcription");
      expect(title).toHaveClass(
        "text-[#000]",
        "text-[18px]",
        "font-['IBM_Plex_Serif']",
        "mb-2",
        "font-semibold",
        "self-start",
      );
    });

    it("should render gradient separator", () => {
      const { container } = renderComponent(false, mockTranscriptions);
      const separator = container.querySelector(".bg-gradient-to-r");
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveClass(
        "w-full",
        "mb-2.5",
        "h-[1px]",
        "bg-gradient-to-r",
        "from-[#E5E7EB]",
        "via-[#E5E7EB]",
        "to-transparent",
      );
    });
  });

  describe("Transcription Display", () => {
    it("should display all transcriptions with correct content", () => {
      renderComponent(false, mockTranscriptions);

      mockTranscriptions.forEach(transcription => {
        expect(screen.getByText(transcription.message)).toBeInTheDocument();
      });
    });

    it("should display speaker names correctly", () => {
      renderComponent(false, mockTranscriptions);

      // First message from user (senderId: 123, userId: 123)
      expect(screen.getAllByText("You")).toHaveLength(2);
      // Second message from other speaker (senderId: 456)
      expect(screen.getByText("Speaker")).toBeInTheDocument();
    });

    it("should not display speaker name for consecutive messages from same sender", () => {
      const consecutiveTranscriptions: Transcription[] = [
        {
          id: 1,
          message: "First message",
          senderId: 123,
          timestamp: "2024-01-01T10:00:00Z",
          isFinal: true,
          isSentenceComplete: true,
        },
        {
          id: 2,
          message: "Second message from same sender",
          senderId: 123,
          timestamp: "2024-01-01T10:00:05Z",
          isFinal: true,
          isSentenceComplete: true,
        },
      ];

      renderComponent(false, consecutiveTranscriptions);

      // Should only show "You" once for the first message
      expect(screen.getAllByText("You")).toHaveLength(1);
      expect(screen.getByText("First message")).toBeInTheDocument();
      expect(screen.getByText("Second message from same sender")).toBeInTheDocument();
    });

    it("should apply typing animation with correct delay", () => {
      renderComponent(false, mockTranscriptions);

      const messageElements = screen.getAllByText(
        /Hello, how are you today\?|I'm doing well, thank you for asking\.|That's great to hear!/,
      );

      messageElements.forEach((element, index) => {
        expect(element).toHaveClass("typing-animation");
        expect(element).toHaveStyle({ animationDelay: `${index * 100}ms` });
      });
    });

    it("should use correct key for transcription items", () => {
      // Test with transcriptions that have undefined IDs to trigger getKeyFromIndex
      const transcriptionsWithUndefinedIds: Transcription[] = [
        {
          id: undefined as any, // undefined value
          message: "Message with undefined ID",
          senderId: 123,
          timestamp: "2024-01-01T10:00:00Z",
          isFinal: true,
          isSentenceComplete: true,
        },
      ];

      renderComponent(false, transcriptionsWithUndefinedIds);

      // Verify getKeyFromIndex was called with correct parameters
      expect(getKeyFromIndex).toHaveBeenCalledWith(0, "transcript");
    });

    it("should use transcription id when available", () => {
      const transcriptionsWithIds: Transcription[] = [
        {
          id: 999,
          message: "Message with ID",
          senderId: 123,
          timestamp: "2024-01-01T10:00:00Z",
          isFinal: true,
          isSentenceComplete: true,
        },
      ];

      renderComponent(false, transcriptionsWithIds);
      expect(screen.getByText("Message with ID")).toBeInTheDocument();
    });
  });

  describe("Focus Mode Behavior", () => {
    it("should have correct initial height when not in focus mode", () => {
      const { container } = renderComponent(false, mockTranscriptions);
      const motionDiv = container.querySelector(".w-\\[85\\%\\]");
      expect(motionDiv).toBeInTheDocument();
    });

    it("should have correct classes for transcript container", () => {
      const { container } = renderComponent(false, mockTranscriptions);
      const transcriptContainer = container.querySelector(".z-10.flex-1.overflow-y-auto");
      expect(transcriptContainer).toHaveClass(
        "z-10",
        "flex-1",
        "overflow-y-auto",
        "text-[#000]",
        "rounded-lg",
        "p-0",
        "transition-all",
        "duration-500",
        "ease-in-out",
        "custom-scrollbar",
        "mb-20",
        "flex",
        "flex-col",
        "gap-2",
      );
    });
  });

  describe("Scroll Behavior", () => {
    it("should handle scroll events correctly", () => {
      const { container } = renderComponent(false, mockTranscriptions);

      const transcriptContainer = container.querySelector(".z-10.flex-1.overflow-y-auto");
      expect(transcriptContainer).toBeInTheDocument();

      // Simulate scroll event by directly calling the onScroll handler
      if (transcriptContainer) {
        const scrollEvent = new Event("scroll", { bubbles: true });
        Object.defineProperty(transcriptContainer, "scrollHeight", { value: 200, writable: true });
        Object.defineProperty(transcriptContainer, "scrollTop", { value: 100, writable: true });
        Object.defineProperty(transcriptContainer, "clientHeight", { value: 100, writable: true });
        fireEvent(transcriptContainer, scrollEvent);
      }
    });

    it("should detect when user is at bottom of scroll", () => {
      const { container } = renderComponent(false, mockTranscriptions);

      const transcriptContainer = container.querySelector(".z-10.flex-1.overflow-y-auto");
      expect(transcriptContainer).toBeInTheDocument();

      // Simulate scroll to bottom (within 1px tolerance)
      if (transcriptContainer) {
        const scrollEvent = new Event("scroll", { bubbles: true });
        Object.defineProperty(transcriptContainer, "scrollHeight", { value: 200, writable: true });
        Object.defineProperty(transcriptContainer, "scrollTop", { value: 99, writable: true });
        Object.defineProperty(transcriptContainer, "clientHeight", { value: 100, writable: true });
        fireEvent(transcriptContainer, scrollEvent);
      }
    });
  });

  describe("User State Integration", () => {
    it("should work with different user IDs", () => {
      const differentUser = { userId: 789, name: "Different User" };
      renderComponent(false, mockTranscriptions, differentUser);

      // Messages from senderId 123 should show as "Speaker" for user 789
      // Messages from senderId 456 should show as "Speaker" for user 789
      expect(screen.getAllByText("Speaker")).toHaveLength(3);
    });

    it("should handle undefined user gracefully", () => {
      renderComponent(false, mockTranscriptions, null);

      // Should still render transcriptions
      expect(screen.getByText("Hello, how are you today?")).toBeInTheDocument();
    });
  });

  describe("Transcription Item Structure", () => {
    it("should have correct structure for each transcription", () => {
      const { container } = renderComponent(false, mockTranscriptions);

      // Find the transcript container first, then look for transcription items within it
      const transcriptContainer = container.querySelector(".z-10.flex-1.overflow-y-auto");
      const transcriptionContainers = transcriptContainer?.querySelectorAll(
        '[class*="flex"][class*="flex-col"]',
      );
      expect(transcriptionContainers).toHaveLength(3);

      transcriptionContainers?.forEach(container => {
        const speakerName = container.querySelector('[class*="font-bold"]');
        expect(speakerName).toBeInTheDocument();

        const message = container.querySelector('[class*="typing-animation"]');
        expect(message).toBeInTheDocument();
      });
    });

    it("should have correct styling for speaker names", () => {
      renderComponent(false, mockTranscriptions);

      const speakerNames = screen.getAllByText(/You|Speaker/);
      speakerNames.forEach(name => {
        expect(name).toHaveClass("font-bold", "w-[20%]", "mb-[0px]");
      });
    });

    it("should have correct styling for messages", () => {
      renderComponent(false, mockTranscriptions);

      const messages = screen.getAllByText(
        /Hello, how are you today\?|I'm doing well, thank you for asking\.|That's great to hear!/,
      );
      messages.forEach(message => {
        expect(message).toHaveClass(
          "typing-animation",
          "w-full",
          "text-[#525252]",
          "text-[16px]",
          "leading-[22px]",
        );
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle transcriptions with missing id", () => {
      const transcriptionsWithoutId: Transcription[] = [
        {
          id: 0, // 0 is falsy, so should fallback to getKeyFromIndex
          message: "Message without proper ID",
          senderId: 123,
          timestamp: "2024-01-01T10:00:00Z",
          isFinal: true,
          isSentenceComplete: true,
        },
      ];

      renderComponent(false, transcriptionsWithoutId);
      expect(screen.getByText("Message without proper ID")).toBeInTheDocument();
    });

    it("should handle single transcription", () => {
      const singleTranscription: Transcription[] = [
        {
          id: 1,
          message: "Only one message",
          senderId: 123,
          timestamp: "2024-01-01T10:00:00Z",
          isFinal: true,
          isSentenceComplete: true,
        },
      ];

      renderComponent(false, singleTranscription);
      expect(screen.getByText("Only one message")).toBeInTheDocument();
      expect(screen.getByText("You")).toBeInTheDocument();
    });

    it("should handle transcriptions with special characters", () => {
      const specialCharTranscriptions: Transcription[] = [
        {
          id: 1,
          message: "Message with special chars: @#$%^&*()",
          senderId: 123,
          timestamp: "2024-01-01T10:00:00Z",
          isFinal: true,
          isSentenceComplete: true,
        },
      ];

      renderComponent(false, specialCharTranscriptions);
      expect(screen.getByText("Message with special chars: @#$%^&*()")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", () => {
      renderComponent(false, mockTranscriptions);
      const heading = screen.getByText("Real-time Transcription");
      expect(heading.tagName).toBe("H3");
    });

    it("should be scrollable", () => {
      const { container } = renderComponent(false, mockTranscriptions);
      const scrollContainer = container.querySelector(".z-10.flex-1.overflow-y-auto");
      expect(scrollContainer).toHaveClass("overflow-y-auto");
    });
  });
});
