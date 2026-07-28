import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@constants";

import StartSessionDialog from "../StartSessionDialog";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@hooks", () => ({
  useUser: () => ({}),
}));

// Mock ui-shared to avoid fetching google-sign-in-button
vi.mock("@ally-ui-mono/ui-shared", () => ({
  GoogleSignInButton: () => <div data-testid="google-sign-in-button">Google Sign In</div>,
  FEATURE_FLAGS_MAP: {},
}));

// Mock ConfirmationDialog and Session icon
vi.mock("@components", () => ({
  ConfirmationDialog: ({
    children,
    onButtonClick,
    buttonText,
    onSecondaryButtonClick,
    secondaryButtonText,
  }: any) => (
    <div>
      {" "}
      <button onClick={onButtonClick}>{buttonText}</button>
      {secondaryButtonText && (
        <button onClick={onSecondaryButtonClick}>{secondaryButtonText}</button>
      )}
      {children}{" "}
    </div>
  ),
  Carousel: ({ slides }: any) => (
    <div data-testid="carousel">
      {slides?.map((slide: any, index: number) => (
        <div key={index} data-testid={`carousel-slide-${index}`}>
          {slide.text}
        </div>
      ))}
    </div>
  ),
  CarouselVariant: { LIGHT: "LIGHT", DARK: "DARK" },
  CarouselSize: { SMALL: "SMALL", LARGE: "LARGE" },
  ButtonVariant: { PRIMARY: "primary", SECONDARY: "secondary" },
}));
vi.mock("@assets/icons", () => ({
  Session: () => <div>SessionIcon</div>,
  ScribeIcon: () => <div>ScribeIcon</div>,
  StatsIcon: () => <div>StatsIcon</div>,
  SearchIcon: () => <div>SearchIcon</div>,
  CommunityIcon: () => <div>CommunityIcon</div>,
  LearnIcon: () => <div>LearnIcon</div>,
}));

describe("StartSessionDialog", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the scribe button", () => {
    render(<StartSessionDialog isOpen={true} onClose={onClose} />);
    expect(screen.getByText("Start Scribe Mode")).toBeInTheDocument();
  });

  it("no longer offers the retired dictation mode", () => {
    render(<StartSessionDialog isOpen={true} onClose={onClose} />);
    expect(screen.queryByText("Start Dictation Mode")).not.toBeInTheDocument();
  });

  it("navigates to microphone mode when Start Scribe Mode is clicked", () => {
    render(<StartSessionDialog isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Start Scribe Mode"));
    expect(mockNavigate).toHaveBeenCalledWith(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  });
});
