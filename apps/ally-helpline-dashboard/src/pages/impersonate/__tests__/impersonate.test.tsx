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
vi.mock("@src/constants", () => ({
  ROUTES: {
    LOGIN: "/login",
  },
}));

describe("ImpersonateHandler", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    localStorage.clear();

    // Override window.location safely
    Object.defineProperty(window, "location", {
      value: {
        search: "",
        href: "http://localhost:3000/impersonate",
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
    // Set up window location with tokens
    window.location.search =
      "?accessToken=test-access&refreshToken=test-refresh&impersonatedByAccessToken=test-admin-access";
    window.location.href = `http://localhost:3000/impersonate${window.location.search}`;

    render(
      <MemoryRouter>
        <ImpersonateHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Verify local storage is updated
      expect(localStorage.getItem("accessToken")).toBe("test-access");
      expect(localStorage.getItem("refreshToken")).toBe("test-refresh");
      expect(localStorage.getItem("isImpersonating")).toBe("true");
      expect(localStorage.getItem("impersonationStartTime")).toBeTruthy();
      expect(localStorage.getItem("impersonatedByAccessToken")).toBe("test-admin-access");

      // Verify url params are stripped
      expect(window.history.replaceState).toHaveBeenCalledWith(
        {},
        "",
        "http://localhost:3000/impersonate",
      );

      // Verify success toast
      expect(toast.success).toHaveBeenCalled();

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
    });
  });

  it("should handle missing tokens correctly", async () => {
    // Set up window location without tokens
    window.location.search = "";
    window.location.href = "http://localhost:3000/impersonate";

    render(
      <MemoryRouter>
        <ImpersonateHandler />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Verify local storage is not set
      expect(localStorage.getItem("accessToken")).toBeNull();
      expect(localStorage.getItem("refreshToken")).toBeNull();
      expect(localStorage.getItem("isImpersonating")).toBeNull();
      expect(localStorage.getItem("impersonatedByAccessToken")).toBeNull();

      // Verify error toast
      expect(toast.error).toHaveBeenCalledWith("Invalid data for impersonation");

      // Verify navigation
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.LOGIN);
    });
  });
});
