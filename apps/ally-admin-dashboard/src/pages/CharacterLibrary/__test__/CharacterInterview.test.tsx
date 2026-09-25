import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CharacterInterview } from "../CharacterInterview";

vi.mock("@api", () => ({
  useCreateCharacterInterviewSessionMutation: vi.fn(),
  useLazyGetCharacterInterviewSessionQuery: vi.fn(),
  baseAPI: {
    reducerPath: "api",
    reducer: () => ({}),
    middleware: () => (next: any) => (action: any) => next(action),
  },
  evaluatorAPI: {
    reducerPath: "evaluatorApi",
    reducer: () => ({}),
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

import * as api from "@api";

vi.mock("@assets", () => ({
  ArrowDown: () => <svg data-testid="arrow-down-icon" />,
}));

vi.mock("@components", () => ({
  ActionConfirmationPopup: () => null,
  CharacterSidePanel: () => null,
}));
vi.mock("@components/character-corpus", () => ({
  CharacterCorpusPanel: () => null,
}));
vi.mock("@components/character-interview", () => ({
  ChatComposer: () => <div data-testid="chat-composer" />,
  ChatMessage: () => <div data-testid="chat-message" />,
  VoiceShortlistStrip: () => <div data-testid="voice-shortlist-strip" />,
}));

vi.mock("@hooks", () => ({
  useCanCurateCharacterCorpus: vi.fn(() => true),
  useCharacterInterviewStream: vi.fn(() => ({
    messages: [],
    isStreaming: false,
    sendMessage: vi.fn(),
    stop: vi.fn(),
    hydrateMessages: vi.fn(),
    resetMessages: vi.fn(),
  })),
  useUser: vi.fn(() => ({
    featureFlags: {},
  })),
}));

vi.mock("@constants", () => ({
  en: {
    characterInterview: {
      title: "Interview a character",
      startFailed: "Failed to start session",
      draftReadyToast: "Draft ready",
      reviewCharacter: "Review Character",
      exitConfirmTitle: "Exit?",
      exitConfirmDescription: "Progress will be lost.",
      exitConfirmLeave: "Leave",
      exitConfirmStay: "Stay",
      startOver: "Start over",
    },
    simulation: {
      characters: "Characters",
    },
    characterCorpus: {
      trigger: "Reference corpus",
    },
  },
  LOCAL_STORAGE_KEYS: {
    CHARACTER_INTERVIEW_SESSION_ID: "char_interview_session_id",
  },
  ROUTES: {
    CHARACTER_LIBRARY: "/character-library",
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderCharacterInterview = () =>
  render(
    <MemoryRouter>
      <CharacterInterview />
    </MemoryRouter>,
  );

describe("CharacterInterview", () => {
  const mockCreateSession = vi.fn();
  const mockGetSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSession.mockReturnValue({ unwrap: () => Promise.resolve({ id: "new-session" }) });
    mockGetSession.mockReturnValue({
      unwrap: () => Promise.resolve({ id: "session-123", status: "ACTIVE", messages: [] }),
    });

    (api.useCreateCharacterInterviewSessionMutation as ReturnType<typeof vi.fn>).mockReturnValue([
      mockCreateSession,
    ]);
    (api.useLazyGetCharacterInterviewSessionQuery as ReturnType<typeof vi.fn>).mockReturnValue([
      mockGetSession,
    ]);
  });

  it("should have the arrow icon inside the clickable back button", async () => {
    renderCharacterInterview();
    await screen.findByText("Characters");
    const charactersLink = screen.getByText("Characters");
    // The ArrowDown icon should be inside the clickable element for it to be a single control
    expect(charactersLink.querySelector('[data-testid="arrow-down-icon"]')).toBeInTheDocument();
  });
});
