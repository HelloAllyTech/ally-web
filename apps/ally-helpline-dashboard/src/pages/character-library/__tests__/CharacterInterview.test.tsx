import "@constants";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LOCAL_STORAGE_KEYS } from "@constants";

const createSessionMock = vi.fn();
const getSessionMock = vi.fn();
vi.mock("@api", () => ({
  useCreateCharacterInterviewSessionMutation: () => [createSessionMock],
  useLazyGetCharacterInterviewSessionQuery: () => [getSessionMock],
}));

vi.mock("@components", () => ({
  ButtonVariant: { DESTRUCTIVE: "destructive", SECONDARY: "secondary" },
  FallbackUI: () => null,
  // Renders its two actions while open, so the test can drive the dialog.
  ConfirmationDialog: (props: {
    isOpen: boolean;
    title: { normal: string };
    buttonText: string;
    onButtonClick: () => void;
    secondaryButtonText: string;
    onSecondaryButtonClick: () => void;
  }) =>
    props.isOpen ? (
      <div role="dialog" aria-label={props.title.normal}>
        <button onClick={props.onButtonClick}>{props.buttonText}</button>
        <button onClick={props.onSecondaryButtonClick}>{props.secondaryButtonText}</button>
      </div>
    ) : null,
}));
vi.mock("@components/character-interview", () => ({
  ChatComposer: () => null,
  ChatMessage: () => null,
}));
vi.mock("@components/character-library", () => ({ CharacterFormPanel: () => null }));

const sendMessageMock = vi.fn();
const stopMock = vi.fn();
const resetMessagesMock = vi.fn();
vi.mock("@hooks", () => ({
  useCanViewCharacterLibrary: () => ({ canView: true, isLoading: false }),
  useCharacterInterviewStream: () => ({
    // One answered turn, so the page treats the interview as having progress.
    messages: [
      { id: "a1", role: "assistant", content: "Who is this character?" },
      { id: "u1", role: "user", content: "A retired teacher" },
    ],
    isStreaming: false,
    sendMessage: sendMessageMock,
    stop: stopMock,
    hydrateMessages: vi.fn(),
    resetMessages: resetMessagesMock,
  }),
}));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { CharacterInterview } from "../CharacterInterview";

const key = LOCAL_STORAGE_KEYS.CHARACTER_INTERVIEW_SESSION_ID;

const renderPage = () =>
  render(
    <MemoryRouter>
      <CharacterInterview />
    </MemoryRouter>,
  );

describe("CharacterInterview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(key, "stuck-session");
    getSessionMock.mockReturnValue({
      unwrap: () => Promise.resolve({ id: "stuck-session", status: "ACTIVE", messages: [] }),
    });
    createSessionMock.mockReturnValue({ unwrap: () => Promise.resolve({ id: "fresh-session" }) });
  });

  it("forgets the session on Leave, so reopening starts a new interview", async () => {
    renderPage();
    await waitFor(() => expect(getSessionMock).toHaveBeenCalledWith("stuck-session"));

    fireEvent.click(screen.getByRole("button", { name: /characters/i }));
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    // Regression: Leave kept the pinned id, despite the dialog saying progress
    // would be lost, so every visit resumed the same stuck conversation.
    expect(localStorage.getItem(key)).toBeNull();
    expect(navigateMock).toHaveBeenCalled();
  });

  it("starts a fresh session from Start over, after confirming", async () => {
    renderPage();
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled());
    expect(createSessionMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    // Nothing is discarded until the admin confirms.
    expect(localStorage.getItem(key)).toBe("stuck-session");

    const dialog = screen.getByRole("dialog", { name: /start a new interview/i });
    fireEvent.click(dialog.querySelector("button") as HTMLButtonElement);

    await waitFor(() => expect(localStorage.getItem(key)).toBe("fresh-session"));
    expect(resetMessagesMock).toHaveBeenCalled();
    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith("Let's begin.", undefined, true),
    );
  });
});
