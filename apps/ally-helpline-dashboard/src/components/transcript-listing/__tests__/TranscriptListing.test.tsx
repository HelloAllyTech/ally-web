/**
 * Covers the "See this moment" jump: a debrief-note chip asks the listing to
 * bring one message into view and mark it briefly. Playback highlighting and
 * pagination are exercised elsewhere; this file is about the jump.
 */

import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import TranscriptListing from "../TranscriptListing";

vi.mock("@ally-ui-mono/ui-shared", () => ({
  InfiniteScroll: ({ children }: any) => <div data-testid="infinite-scroll">{children}</div>,
}));

vi.mock("@components", () => ({
  AudioTranscriptPlayer: () => <div data-testid="audio-player" />,
}));

const transcriptList = [
  { id: 11, content: "Opening line", senderId: -1, startSeconds: 0 },
  { id: 22, content: "The moment in question", senderId: 5, startSeconds: 12 },
  { id: 33, content: "Closing line", senderId: -1, startSeconds: 30 },
];

/** The row is whichever element carries the message text. */
const rowFor = (text: string) => screen.getByText(text).closest("div[class*='rounded-md']");

describe("TranscriptListing moment focus", () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // jsdom has no layout, so scrollIntoView is not implemented there.
    scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scrolls the requested message into view and marks it", () => {
    render(
      <TranscriptListing
        transcriptList={transcriptList as any}
        hasMore={false}
        focusRequest={{ messageId: "22", requestId: 1 }}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    // The anchor's id is a string while the transcript's is numeric — the
    // match has to survive that.
    expect(rowFor("The moment in question")?.className).toContain("ring-2");
    expect(rowFor("Opening line")?.className).not.toContain("ring-2");
  });

  it("lets the highlight expire rather than leaving the row selected", () => {
    render(
      <TranscriptListing
        transcriptList={transcriptList as any}
        hasMore={false}
        focusRequest={{ messageId: "22", requestId: 1 }}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(rowFor("The moment in question")?.className).not.toContain("ring-2");
  });

  it("does nothing when the id is not in the loaded transcript", () => {
    render(
      <TranscriptListing
        transcriptList={transcriptList as any}
        hasMore={false}
        focusRequest={{ messageId: "999", requestId: 1 }}
      />,
    );

    // The caller owns the fallback message — the listing just stays put
    // instead of scrolling somewhere arbitrary.
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(rowFor("Opening line")?.className).not.toContain("ring-2");
  });

  it("waits for the transcript when the request arrives before the messages", () => {
    const { rerender } = render(
      <TranscriptListing
        transcriptList={[] as any}
        hasMore={false}
        focusRequest={{ messageId: "22", requestId: 1 }}
      />,
    );

    expect(scrollIntoView).not.toHaveBeenCalled();

    rerender(
      <TranscriptListing
        transcriptList={transcriptList as any}
        hasMore={false}
        focusRequest={{ messageId: "22", requestId: 1 }}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(rowFor("The moment in question")?.className).toContain("ring-2");
  });

  it("scrolls again when the same moment is requested a second time", () => {
    const { rerender } = render(
      <TranscriptListing
        transcriptList={transcriptList as any}
        hasMore={false}
        focusRequest={{ messageId: "22", requestId: 1 }}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    rerender(
      <TranscriptListing
        transcriptList={transcriptList as any}
        hasMore={false}
        focusRequest={{ messageId: "22", requestId: 2 }}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(rowFor("The moment in question")?.className).toContain("ring-2");
  });

  it("scrolls again when the same chip is tapped a second time before the highlight expires", () => {
    const { rerender } = render(
      <TranscriptListing
        transcriptList={transcriptList as any}
        hasMore={false}
        focusRequest={{ messageId: "22", requestId: 1 }}
      />,
    );

    // Well within the 2.5s highlight window — the learner tapped again
    // because they weren't sure the first tap registered.
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    rerender(
      <TranscriptListing
        transcriptList={transcriptList as any}
        hasMore={false}
        focusRequest={{ messageId: "22", requestId: 2 }}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(rowFor("The moment in question")?.className).toContain("ring-2");
  });
});
