import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@constants";
import { UserStatus } from "@types";

import StartSessionDialog from "../StartSessionDialog";

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useUser hook
const mockUpdateUserStatus = vi.fn();
vi.mock("@hooks", () => ({
  useUser: () => ({ updateUserStatus: mockUpdateUserStatus }),
}));

// Mock ConfirmationDialog and Session icon
vi.mock("@components", () => ({
  ConfirmationDialog: ({ children, onButtonClick, buttonText }: any) => (
    <div>
      {" "}
      <button onClick={onButtonClick}>{buttonText}</button>
      {children}{" "}
    </div>
  ),
  ButtonVariant: { PRIMARY: "primary" },
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

  it("renders the dialog content when open", () => {
    render(<StartSessionDialog isOpen={true} onClose={onClose} />);
    expect(screen.getByText("Start Session now")).toBeInTheDocument();
    expect(screen.getByText("Listen Live")).toBeInTheDocument();
  });

  it("calls updateUserStatus and navigates when start button is clicked", () => {
    render(<StartSessionDialog isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText("Start Session now"));
    expect(mockUpdateUserStatus).toHaveBeenCalledWith(UserStatus.OFFLINE);
    expect(mockNavigate).toHaveBeenCalledWith(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  });
});
