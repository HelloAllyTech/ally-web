/// <reference types="@testing-library/jest-dom" />

import React from "react";

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import FeedCard from "../FeedCard";
import type { FeedCardProps } from "../types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@api", () => ({
  useLazyGetGeneralCommentsOverviewQuery: () => [vi.fn(), { data: undefined, isLoading: false }],
}));

vi.mock("@hooks", () => ({
  useUser: () => ({ user: { id: 99, profileImageUrl: null } }),
}));

vi.mock("@utils", () => ({
  getFormattedTimeFromDuration: (n: number) => String(n),
  formatDateTime: () => "Jan 1, 2025",
  formatRelativeTime: () => "just now",
}));

vi.mock("@assets", () => ({
  ReviewTranscript: () => <span data-testid="review-transcript-icon" />,
  ScribeImage: () => <span data-testid="scribe-image" />,
}));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  CustomImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-testid="custom-image" src={src} alt={alt ?? ""} />
  ),
}));

vi.mock("@components", () => ({
  AudioTranscriptPlayer: ({ audioUrl }: { audioUrl: string }) => (
    <div data-testid="audio-transcript-player" data-audio-url={audioUrl} />
  ),
  ReactionsModal: () => null,
}));

const createMockStore = () =>
  configureStore({
    reducer: {
      user: () => ({
        user: { id: 99, name: "Tester", email: "t@x.com", profileImageUrl: null },
      }),
    },
  });

const renderFeedCard = (overrides: Partial<FeedCardProps> = {}) => {
  const props: FeedCardProps = {
    id: "review-1",
    createdAt: new Date().toISOString(),
    user: { id: 1, name: "Author", profileImage: undefined },
    scenario: {
      title: "Scenario title",
      description: "Scenario description",
      createdAt: new Date().toISOString(),
      duration: "120",
      coverImageUrl: "cover.jpg",
    } as any,
    reactions: {},
    commentsCount: 0,
    onReviewTranscript: vi.fn(),
    duration: 120,
    dateTime: new Date().toISOString(),
    onTapViewMore: vi.fn(),
    note: "A note",
    ...overrides,
  };

  return render(
    <Provider store={createMockStore()}>
      <MemoryRouter>
        <FeedCard {...props} />
      </MemoryRouter>
    </Provider>,
  );
};

describe("FeedCard audio playback", () => {
  it("renders the audio player when audioUrl is provided on a simulation review", () => {
    renderFeedCard({ audioUrl: "https://signed.example/audio.mp4" });

    const player = screen.getByTestId("audio-transcript-player");
    expect(player).toBeInTheDocument();
    expect(player).toHaveAttribute("data-audio-url", "https://signed.example/audio.mp4");
  });

  it("does not render the audio player when audioUrl is missing", () => {
    renderFeedCard({ audioUrl: null });

    expect(screen.queryByTestId("audio-transcript-player")).not.toBeInTheDocument();
  });

  it("does not render the audio player when audioUrl is undefined", () => {
    renderFeedCard();

    expect(screen.queryByTestId("audio-transcript-player")).not.toBeInTheDocument();
  });

  it("does not render the audio player for scribe reviews even when audioUrl is set", () => {
    renderFeedCard({
      audioUrl: "https://signed.example/audio.mp4",
      isScribeReview: true,
      scribeSummaryName: "Scribe summary",
    });

    expect(screen.queryByTestId("audio-transcript-player")).not.toBeInTheDocument();
  });
});
