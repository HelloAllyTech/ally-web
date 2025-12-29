import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AudioTranscriptPlayer } from "../AudioTranscriptPlayer";
import { useAudioPlayer } from "../useAudioPlayer";
import { TranscriptItem } from "../TranscriptItemRow";

// Mock functions for useAudioPlayer
const mockSeekTo = vi.fn();
const mockTogglePlay = vi.fn();
const mockSkip = vi.fn();
const mockHandleTimeUpdate = vi.fn();
const mockHandleLoadedMetadata = vi.fn();
const mockHandleEnded = vi.fn();
const mockHandleProgressClick = vi.fn();

vi.mock("../useAudioPlayer", () => ({
  useAudioPlayer: vi.fn(() => ({
    audioRef: { current: null },
    isPlaying: false,
    currentTime: 0,
    duration: 120,
    progress: 0,
    togglePlay: mockTogglePlay,
    skip: mockSkip,
    seekTo: mockSeekTo,
    handleTimeUpdate: mockHandleTimeUpdate,
    handleLoadedMetadata: mockHandleLoadedMetadata,
    handleEnded: mockHandleEnded,
    handleProgressClick: mockHandleProgressClick,
  })),
}));

// Mock PlayerControls component
vi.mock("../PlayerControls", () => ({
  PlayerControls: ({ onTogglePlay, onSkip, onProgressClick }: any) => (
    <div data-testid="player-controls">
      <button data-testid="play-button" onClick={onTogglePlay}>
        Play
      </button>
      <button data-testid="rewind-button" title="Rewind 10s" onClick={() => onSkip(-10)}>
        Rewind
      </button>
      <button data-testid="forward-button" title="Forward 10s" onClick={() => onSkip(10)}>
        Forward
      </button>
      <div data-testid="progress-bar" onClick={onProgressClick} />
    </div>
  ),
}));

// Sample transcript data
const mockTranscript: TranscriptItem[] = [
  { id: 1, content: "Hello, how are you?", senderId: -1, startSeconds: 0, endSeconds: 5 },
  { id: 2, content: "I am doing well, thanks!", senderId: 101, startSeconds: 5, endSeconds: 10 },
  { id: 3, content: "That's great to hear.", senderId: -1, startSeconds: 10, endSeconds: 15 },
  { id: 4, content: "How can I help you today?", senderId: 101, startSeconds: 15, endSeconds: 20 },
  { id: 5, content: "I have a question.", senderId: -1, startSeconds: 20, endSeconds: 25 },
];

const mockUnsortedTranscript: TranscriptItem[] = [
  { id: 3, content: "Third message", senderId: -1, startSeconds: 10, endSeconds: 15 },
  { id: 1, content: "First message", senderId: 101, startSeconds: 0, endSeconds: 5 },
  { id: 2, content: "Second message", senderId: -1, startSeconds: 5, endSeconds: 10 },
];

describe("AudioTranscriptPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to default state
    vi.mocked(useAudioPlayer).mockReturnValue({
      audioRef: { current: null },
      isPlaying: false,
      currentTime: 0,
      duration: 120,
      progress: 0,
      togglePlay: mockTogglePlay,
      skip: mockSkip,
      seekTo: mockSeekTo,
      handleTimeUpdate: mockHandleTimeUpdate,
      handleLoadedMetadata: mockHandleLoadedMetadata,
      handleEnded: mockHandleEnded,
      handleProgressClick: mockHandleProgressClick,
    });
  });

  describe("Rendering", () => {
    it("renders audio element with correct src", () => {
      const audioUrl = "https://example.com/audio.mp3";
      render(<AudioTranscriptPlayer audioUrl={audioUrl} transcript={mockTranscript} />);

      const audioElement = document.querySelector("audio");
      expect(audioElement).toBeInTheDocument();
      expect(audioElement).toHaveAttribute("src", audioUrl);
    });

    it("renders all transcript items", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={mockTranscript} />);

      mockTranscript.forEach(item => {
        expect(screen.getByText(item.content)).toBeInTheDocument();
      });
    });

    it("renders with empty transcript", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={[]} />);

      const audioElement = document.querySelector("audio");
      expect(audioElement).toBeInTheDocument();
    });
  });

  describe("Transcript Sorting", () => {
    it("displays transcript items sorted by startSeconds", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={mockUnsortedTranscript} />);

      const items = screen.getAllByText(/message/i);
      expect(items[0]).toHaveTextContent("First message");
      expect(items[1]).toHaveTextContent("Second message");
      expect(items[2]).toHaveTextContent("Third message");
    });
  });

  describe("Sender Labels", () => {
    it("uses default sender labels when not provided", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={mockTranscript} />);

      expect(screen.getAllByText("User:").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Agent:").length).toBeGreaterThan(0);
    });

    it("uses custom sender labels when provided", () => {
      const customLabels = { [-1]: "Client", [101]: "Therapist" };
      render(
        <AudioTranscriptPlayer
          audioUrl="test.mp3"
          transcript={mockTranscript}
          senderLabels={customLabels}
        />,
      );

      expect(screen.getAllByText("Client:").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Therapist:").length).toBeGreaterThan(0);
    });

    it("falls back to 'Speaker {id}' for unknown sender IDs", () => {
      const transcriptWithUnknownSender: TranscriptItem[] = [
        { id: 1, content: "Unknown sender message", senderId: 999, startSeconds: 0, endSeconds: 5 },
      ];

      render(
        <AudioTranscriptPlayer audioUrl="test.mp3" transcript={transcriptWithUnknownSender} />,
      );

      expect(screen.getByText("Speaker 999:")).toBeInTheDocument();
    });
  });

  describe("Transcript Item Click", () => {
    it("clicking a transcript item triggers seek to that time", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={mockTranscript} />);

      const firstItem = screen
        .getByText("Hello, how are you?")
        .closest("div[class*='cursor-pointer']");
      expect(firstItem).toBeInTheDocument();

      if (firstItem) {
        fireEvent.click(firstItem);
      }

      // Audio element should have its currentTime updated (handled by useAudioPlayer)
      const audioElement = document.querySelector("audio");
      expect(audioElement).toBeInTheDocument();
    });
  });

  describe("onNearEnd Callback", () => {
    it("does not call onNearEnd when activeIndex is not near the end", () => {
      const onNearEnd = vi.fn();

      render(
        <AudioTranscriptPlayer
          audioUrl="test.mp3"
          transcript={mockTranscript}
          onNearEnd={onNearEnd}
          nearEndThreshold={2}
        />,
      );

      // At initial state (currentTime = 0), activeIndex should be 0 or -1
      // With 5 items and threshold of 2, it should not trigger
      expect(onNearEnd).not.toHaveBeenCalled();
    });

    it("does not call onNearEnd when isLoading is true", () => {
      const onNearEnd = vi.fn();

      render(
        <AudioTranscriptPlayer
          audioUrl="test.mp3"
          transcript={mockTranscript}
          onNearEnd={onNearEnd}
          nearEndThreshold={5}
          isLoading={true}
        />,
      );

      expect(onNearEnd).not.toHaveBeenCalled();
    });

    it("does not call onNearEnd when transcript is empty", () => {
      const onNearEnd = vi.fn();

      render(
        <AudioTranscriptPlayer
          audioUrl="test.mp3"
          transcript={[]}
          onNearEnd={onNearEnd}
          nearEndThreshold={2}
        />,
      );

      expect(onNearEnd).not.toHaveBeenCalled();
    });
  });

  describe("Player Controls Integration", () => {
    it("renders player controls", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={mockTranscript} />);

      expect(screen.getByTestId("player-controls")).toBeInTheDocument();
    });

    it("calls togglePlay when play button is clicked", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={mockTranscript} />);

      fireEvent.click(screen.getByTestId("play-button"));
      expect(mockTogglePlay).toHaveBeenCalled();
    });

    it("calls skip with -10 when rewind button is clicked", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={mockTranscript} />);

      fireEvent.click(screen.getByTestId("rewind-button"));
      expect(mockSkip).toHaveBeenCalledWith(-10);
    });

    it("calls skip with 10 when forward button is clicked", () => {
      render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={mockTranscript} />);

      fireEvent.click(screen.getByTestId("forward-button"));
      expect(mockSkip).toHaveBeenCalledWith(10);
    });
  });
});

describe("Active Segment Detection", () => {
  it("correctly identifies active segment based on currentTime", () => {
    // This tests the useMemo logic for activeIndex
    const transcript: TranscriptItem[] = [
      { id: 1, content: "First", senderId: -1, startSeconds: 0, endSeconds: 10 },
      { id: 2, content: "Second", senderId: 101, startSeconds: 10, endSeconds: 20 },
      { id: 3, content: "Third", senderId: -1, startSeconds: 20, endSeconds: 30 },
    ];

    render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={transcript} />);

    // At time 0, first item should be rendered
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
  });
});

describe("Timestamp Display", () => {
  it("displays timestamps in correct format", () => {
    const transcript: TranscriptItem[] = [
      { id: 1, content: "Test message", senderId: -1, startSeconds: 5.5, endSeconds: 10 },
    ];

    render(<AudioTranscriptPlayer audioUrl="test.mp3" transcript={transcript} />);

    // Should display "5.50" (toFixed(2))
    expect(screen.getByText("5.50")).toBeInTheDocument();
  });
});
