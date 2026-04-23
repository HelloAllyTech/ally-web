import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ImpersonateHandler } from "../impersonate";
import { ROUTES } from "@src/constants";

// Mock react-router-dom so we can spy on useNavigate
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock constants
vi.mock("@constants", () => ({
  ROUTES: {
    LOGIN: "/login",
    HOME: "/",
  },
}));
vi.mock("@src/constants", () => ({
  ROUTES: {
    LOGIN: "/login",
    HOME: "/",
  },
}));

const mockExchangeCodeFn = vi.fn(() => ({
  unwrap: vi.fn().mockResolvedValue({
    accessToken: "test-access",
    refreshToken: "test-refresh",
    user: { id: "test-admin-id" },
  }),
}));

vi.mock("@api", () => ({
  useExchangeImpersonateCodeMutation: () => [mockExchangeCodeFn],
}));

describe("ImpersonateHandler", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    localStorage.clear();

    // Default mock response for standard calls
    mockExchangeCodeFn.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({
        accessToken: "test-access",
        refreshToken: "test-refresh",
        user: { id: "test-admin-id" },
      }),
    }));

    // Override window.location safely
    Object.defineProperty(window, "location", {
      value: {
        search: "",
        href: "http://localhost:3000/auth/impersonate/callback",
      },
      writable: true,
    });

    // Override window.history
    Object.defineProperty(window, "history", {
      value: {
        replaceState: vi.fn(),
      },
      writable: true,
    });
  });

  it("should handle valid impersonation tokens correctly", async () => {
    // Set up window location with code
    window.location.search = "?code=test-code";
    window.location.href = `http://localhost:3000/auth/impersonate/callback${window.location.search}`;

    render(
      <MemoryRouter>
        <ImpersonateHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Verify API was called
      expect(mockExchangeCodeFn).toHaveBeenCalledWith({ authCode: "test-code" });

      // Verify local storage is updated
      expect(localStorage.getItem("accessToken")).toBe("test-access");
      expect(localStorage.getItem("refreshToken")).toBe("test-refresh");
      expect(localStorage.getItem("isImpersonating")).toBe("true");
      expect(localStorage.getItem("impersonationStartTime")).toBeTruthy();
      expect(localStorage.getItem("adminUserId")).toBe("test-admin-id");

      // Verify url params are stripped
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        "",
        "http://localhost:3000/auth/impersonate/callback",
      );

      // Verify success toast
      expect(toast.success).toHaveBeenCalled();

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.HOME);
    });
  });

  it("should handle missing code correctly", async () => {
    window.location.search = "";
    window.location.href = "http://localhost:3000/auth/impersonate/callback";

    render(
      <MemoryRouter>
        <ImpersonateHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockExchangeCodeFn).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Invalid verification code");
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
    });
  });

  it("should handle API failure correctly", async () => {
    mockExchangeCodeFn.mockImplementationOnce(() => ({
      unwrap: vi.fn().mockRejectedValue(new Error("API Error")),
    }));

    window.location.search = "?code=invalid-code";
    window.location.href = `http://localhost:3000/auth/impersonate/callback${window.location.search}`;

    render(
      <MemoryRouter>
        <ImpersonateHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockExchangeCodeFn).toHaveBeenCalledWith({ authCode: "invalid-code" });
      expect(toast.error).toHaveBeenCalledWith("Failed to begin impersonation");
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
    });
  });
});
