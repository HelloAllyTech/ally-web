import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import LoginDialog from "../LoginDialog";

// Simplify motion wrappers
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@assets", () => ({
  BackCircle: (props: any) => <button data-testid="back" {...props} />,
  CloseIcon: (props: any) => <button data-testid="close" {...props} />,
}));

// Mock API hooks
const mockGenerate = vi.fn();
const mockVerify = vi.fn();
vi.mock("@api", () => ({
  useGenerateOTPMutation: () => [mockGenerate, { isLoading: false, isSuccess: false }],
  useVerifyOTPMutation: () => [mockVerify, { isLoading: false, isSuccess: false }],
}));

// Mock user hook
vi.mock("@hooks", () => ({
  useUser: () => ({ checkAuth: vi.fn() }),
}));

// Mock utils
const openLinkSpy = vi.fn();
vi.mock("@utils", () => ({
  openLinkInNewTab: (url: string) => openLinkSpy(url),
  validateEmail: (email: string) => /.+@.+\..+/.test(email),
}));

// Mock constants to stable URLs — direct mock to avoid loading the real barrel
// (common.ts imports Carousel1 from @assets which is mocked without it)
vi.mock("@constants", () => ({
  ALLY_TERMS_URL: "https://example.com/terms",
  ALLY_PRIVACY_POLICY_URL: "https://example.com/privacy",
  LOCAL_STORAGE_KEYS: {
    ACCESS_TOKEN: "accessToken",
    REFRESH_TOKEN: "refreshToken",
    ROOM_DATA: "roomData",
  },
  LoginSection: {
    EMAIL: "Email",
    OTP: "OTP",
  },
}));

// Mock child components used by LoginDialog
vi.mock("../../button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("../../text-field", () => ({
  default: ({ label, value, onChange, placeholder, errorMessage }: any) => (
    <div>
      <label>{label}</label>
      <input aria-label={label} value={value} onChange={onChange} placeholder={placeholder} />
      {errorMessage ? <div role="alert">{errorMessage}</div> : null}
    </div>
  ),
}));

vi.mock("../../otp", () => ({
  default: ({ value, onChange }: any) => (
    <input aria-label="otp" value={value} onChange={e => onChange(e.target.value)} />
  ),
}));

describe("LoginDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders email section and validates email before generating OTP", () => {
    render(<LoginDialog isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    const nextBtn = screen.getByRole("button", { name: /Next|Generating OTP/i });
    expect(nextBtn).toBeDisabled();

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "invalid" } });
    fireEvent.click(nextBtn);

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid email address");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("remembers email and calls generateOTP with trimmed lowercase email", () => {
    render(<LoginDialog isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "  USER@EXAMPLE.COM  " } });

    // check remember me
    const remember = screen.getByLabelText(/Remember me/i);
    fireEvent.click(remember);

    const nextBtn = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextBtn);

    expect(localStorage.getItem("rememberedEmail")).toBe("user@example.com");
    expect(mockGenerate).toHaveBeenCalledWith({ email: "user@example.com" });
  });

  it("opens links for terms and privacy", () => {
    render(<LoginDialog isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByText(/Terms & Conditions/i));
    expect(openLinkSpy).toHaveBeenCalledWith("https://example.com/terms");

    fireEvent.click(screen.getByText(/Privacy Policy/i));
    expect(openLinkSpy).toHaveBeenCalledWith("https://example.com/privacy");
  });

  it("close icon and Escape both trigger onClose callback", () => {
    const onClose = vi.fn();
    render(<LoginDialog isOpen onClose={onClose} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByTestId("close"));
    expect(onClose).toHaveBeenCalled();

    // Carbon ComposedModal closes on Escape.
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
