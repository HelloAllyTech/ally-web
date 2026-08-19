import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { AudioTranscriptPlayer } from "../AudioTranscriptPlayer";
import { useAudioPlayer } from "../useAudioPlayer";

const mockTogglePlay = vi.fn();
const mockHandleTimeUpdate = vi.fn();
const mockHandleLoadedMetadata = vi.fn();
const mockHandleEnded = vi.fn();
const mockSeekToFraction = vi.fn();
const mockSeekTo = vi.fn();
const mockSetPlaybackRate = vi.fn();

vi.mock("../useAudioPlayer", () => ({
  useAudioPlayer: vi.fn(() => ({
    audioRef: { current: null },
    isPlaying: false,
    currentTime: 0,
    duration: 120,
    progress: 0,
    playbackRate: 1,
    togglePlay: mockTogglePlay,
    seekTo: mockSeekTo,
    handleTimeUpdate: mockHandleTimeUpdate,
    handleLoadedMetadata: mockHandleLoadedMetadata,
    handleEnded: mockHandleEnded,
    handleProgressClick: vi.fn(),
    seekToFraction: mockSeekToFraction,
    setPlaybackRate: mockSetPlaybackRate,
  })),
}));

vi.mock("../PlayerControls", () => ({
  PlayerControls: ({
    onTogglePlay,
    onSeekFraction,
  }: {
    onTogglePlay: () => void;
    onSeekFraction: (f: number) => void;
  }) => (
    <div data-testid="player-controls">
      <button type="button" data-testid="play-button" onClick={onTogglePlay}>
        Play
      </button>
      <div data-testid="progress-bar" onClick={() => onSeekFraction(0.5)} role="presentation" />
    </div>
  ),
}));

describe("AudioTranscriptPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAudioPlayer).mockReturnValue({
      audioRef: { current: null },
      isPlaying: false,
      currentTime: 0,
      duration: 120,
      progress: 0,
      playbackRate: 1,
      togglePlay: mockTogglePlay,
      seekTo: mockSeekTo,
      handleTimeUpdate: mockHandleTimeUpdate,
      handleLoadedMetadata: mockHandleLoadedMetadata,
      handleEnded: mockHandleEnded,
      handleProgressClick: vi.fn(),
      seekToFraction: mockSeekToFraction,
      setPlaybackRate: mockSetPlaybackRate,
    });
  });

  it("renders audio element with correct src", () => {
    const audioUrl = "https://example.com/audio.mp3";
    render(<AudioTranscriptPlayer audioUrl={audioUrl} />);

    const audioElement = document.querySelector("audio");
    expect(audioElement).toBeInTheDocument();
    expect(audioElement).toHaveAttribute("src", audioUrl);
  });

  it("renders player controls", () => {
    render(<AudioTranscriptPlayer audioUrl="test.mp3" />);
    expect(screen.getByTestId("player-controls")).toBeInTheDocument();
  });

  it("calls togglePlay when play button is clicked", () => {
    render(<AudioTranscriptPlayer audioUrl="test.mp3" />);
    fireEvent.click(screen.getByTestId("play-button"));
    expect(mockTogglePlay).toHaveBeenCalled();
  });

  it("calls seekToFraction when progress bar is clicked", () => {
    render(<AudioTranscriptPlayer audioUrl="test.mp3" />);
    fireEvent.click(screen.getByTestId("progress-bar"));
    expect(mockSeekToFraction).toHaveBeenCalledWith(0.5);
  });

  it("calls onSeekSeconds after seek when provided", () => {
    const onSeekSeconds = vi.fn();
    render(<AudioTranscriptPlayer audioUrl="test.mp3" onSeekSeconds={onSeekSeconds} />);
    fireEvent.click(screen.getByTestId("progress-bar"));
    expect(mockSeekToFraction).toHaveBeenCalledWith(0.5);
    expect(onSeekSeconds).toHaveBeenCalledWith(60);
  });

  it("seeks when seekRequest.requestId changes", () => {
    const onSeekSeconds = vi.fn();
    const { rerender } = render(
      <AudioTranscriptPlayer
        audioUrl="test.mp3"
        seekRequest={null}
        onSeekSeconds={onSeekSeconds}
      />,
    );
    expect(mockSeekTo).not.toHaveBeenCalled();

    rerender(
      <AudioTranscriptPlayer
        audioUrl="test.mp3"
        seekRequest={{ seconds: 42, requestId: 1 }}
        onSeekSeconds={onSeekSeconds}
      />,
    );
    expect(mockSeekTo).toHaveBeenCalledWith(42);
    expect(onSeekSeconds).toHaveBeenCalledWith(42);

    rerender(
      <AudioTranscriptPlayer
        audioUrl="test.mp3"
        seekRequest={{ seconds: 42, requestId: 2 }}
        onSeekSeconds={onSeekSeconds}
      />,
    );
    expect(mockSeekTo).toHaveBeenCalledTimes(2);
  });

  it("applies optional className", () => {
    const { container } = render(<AudioTranscriptPlayer audioUrl="test.mp3" className="mb-4" />);
    expect(container.firstChild).toHaveClass("mb-4");
    expect(container.firstChild).toHaveClass("w-full");
  });
});
