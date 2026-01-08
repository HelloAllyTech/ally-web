import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, afterEach, expect } from "vitest";

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: vi.fn(),
  GoogleLogin: (props: any) => (
    <button onClick={() => props.onSuccess?.({ credential: "mock-credential" })}>
      MockGoogleLogin
    </button>
  ),
}));

vi.mock("../../assets", () => ({
  Google: () => <span data-testid="google-icon">G</span>,
}));

import { useGoogleLogin } from "@react-oauth/google";
import GoogleSignInButton, { AUTHENTICATION_TYPE } from "../GoogleSignInButton";

describe("GoogleSignInButton", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls onSuccess with accessToken when login succeeds", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    (useGoogleLogin as any).mockImplementation((opts: any) => {
      return () => opts.onSuccess?.({ access_token: "access-token-123" });
    });

    render(<GoogleSignInButton onSuccess={onSuccess} onError={onError} />);

    const btn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(btn);

    expect(onSuccess).toHaveBeenCalledWith({ accessToken: "access-token-123" });
    expect(onError).not.toHaveBeenCalled();
  });

  it("renders GoogleLogin and forwards credential on success when authenticationType is GOOGLE_CREDENTIAL", () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();

    render(
      <GoogleSignInButton
        onSuccess={onSuccess}
        onError={onError}
        authenticationType={AUTHENTICATION_TYPE.GOOGLE_CREDENTIAL}
      />,
    );

    const mockBtn = screen.getByText("MockGoogleLogin");
    fireEvent.click(mockBtn);

    expect(onSuccess).toHaveBeenCalledWith({ credential: "mock-credential" });
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not call login when the button is disabled", () => {
    const onSuccess = vi.fn();

    (useGoogleLogin as any).mockImplementation((opts: any) => {
      return vi.fn(() => opts.onSuccess?.({ access_token: "should-not-call" }));
    });

    render(<GoogleSignInButton onSuccess={onSuccess} disabled={true} />);

    const btn = screen.getByRole("button", { name: /continue with google/i });
    fireEvent.click(btn);

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
