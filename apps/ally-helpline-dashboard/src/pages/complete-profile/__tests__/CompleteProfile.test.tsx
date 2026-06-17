import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { CompleteProfile } from "../CompleteProfile";

const mockNavigate = vi.fn();
const mockCheckAuth = vi.fn();
const mockUnwrap = vi.fn();
const mockCompleteProfile = vi.fn(() => ({ unwrap: mockUnwrap }));
const mockToastError = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("sonner", () => ({
  toast: { error: (msg: string) => mockToastError(msg) },
}));

vi.mock("@api", () => ({
  useCompleteProfileMutation: () => [mockCompleteProfile, { isLoading: false }],
}));

vi.mock("@hooks", () => ({
  useUser: () => ({ checkAuth: mockCheckAuth }),
}));

vi.mock("@constants", () => ({
  ROUTES: { HOME: "/" },
}));

vi.mock("@components", () => ({
  Button: ({ children, ...props }: any) => (
    <button data-testid="submit-btn" {...props}>
      {children}
    </button>
  ),
  TextField: ({ label, value, onChange, placeholder }: any) => (
    <input
      data-testid="name-input"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
}));

describe("CompleteProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUnwrap.mockResolvedValue({ success: true });
  });

  it("renders the title, subtitle and a disabled submit when name is empty", () => {
    render(<CompleteProfile />);

    expect(screen.getByText("completeProfile.title")).toBeInTheDocument();
    expect(screen.getByText("completeProfile.subtitle")).toBeInTheDocument();
    expect(screen.getByTestId("submit-btn")).toBeDisabled();
  });

  it("enables submit once a name is entered", () => {
    render(<CompleteProfile />);

    fireEvent.change(screen.getByTestId("name-input"), { target: { value: "Jane Doe" } });

    expect(screen.getByTestId("submit-btn")).not.toBeDisabled();
  });

  it("completes the profile, refetches the user, and navigates home on submit", async () => {
    render(<CompleteProfile />);

    fireEvent.change(screen.getByTestId("name-input"), { target: { value: "  Jane Doe  " } });
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(mockCompleteProfile).toHaveBeenCalledWith({ name: "Jane Doe" });
    });
    expect(mockCheckAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("shows an error toast and does not navigate when the request fails", async () => {
    mockUnwrap.mockRejectedValue(new Error("boom"));
    render(<CompleteProfile />);

    fireEvent.change(screen.getByTestId("name-input"), { target: { value: "Jane" } });
    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("completeProfile.error");
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
