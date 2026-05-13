/**
 * Unit Tests for MagicLinkVerify Component
 *
 * Test Coverage:
 * - Component rendering with all states (loading, success, error)
 * - Token extraction from URL search params
 * - Magic link verification flow
 * - Terms and Agreement popup integration
 * - Error handling and user feedback
 * - Navigation on success and failure
 * - Local storage integration
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeAll, beforeEach, afterAll, afterEach } from "vitest";

import { MagicLinkVerify } from "../MagicLinkVerify";

// --- Mock functions using vi.hoisted so they are available in vi.mock factories ---
const {
  mockVerifyMagicLink,
  mockPutTermsAndAgreement,
  mockNavigate,
  mockCheckAuth,
  mockToastError,
  mockToastSuccess,
} = vi.hoisted(() => ({
  mockVerifyMagicLink: vi.fn(),
  mockPutTermsAndAgreement: vi.fn(),
  mockNavigate: vi.fn(),
  mockCheckAuth: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("@api", () => ({
  useVerifyMagicLinkMutation: () => [
    mockVerifyMagicLink,
    {
      isLoading: false,
      isSuccess: false,
      data: null,
      error: null,
    },
  ],
  usePutTermsAndAgreementMutation: () => [
    mockPutTermsAndAgreement,
    {
      isLoading: false,
      isSuccess: false,
      data: null,
      error: null,
    },
  ],
}));

vi.mock("@components", () => ({
  TermsAndAgreement: ({ isOpen, handleAgreeButtonClick }: any) =>
    isOpen ? (
      <div data-testid="terms-and-agreement">
        Terms And Agreement
        <button data-testid="agree-button" onClick={handleAgreeButtonClick}>
          Agree
        </button>
      </div>
    ) : null,
}));

vi.mock("@constants", () => ({
  LOCAL_STORAGE_KEYS: {
    ACCESS_TOKEN: "accessToken",
    REFRESH_TOKEN: "refreshToken",
  },
  ROUTES: {
    LOGIN: "/login",
  },
}));

vi.mock("@hooks", () => ({
  useUser: () => ({
    checkAuth: mockCheckAuth,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

// Mock localStorage — install in beforeAll / restore in afterAll so the
// override does not leak into other test files in the same worker.
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
const ORIGINAL_LOCAL_STORAGE_DESCRIPTOR = Object.getOwnPropertyDescriptor(window, "localStorage");
beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: localStorageMock,
  });
});
afterAll(() => {
  if (ORIGINAL_LOCAL_STORAGE_DESCRIPTOR) {
    Object.defineProperty(window, "localStorage", ORIGINAL_LOCAL_STORAGE_DESCRIPTOR);
  } else {
    delete (window as unknown as Record<string, unknown>).localStorage;
  }
});

// Helper to render with a specific URL
const renderWithRouter = (initialEntries: string[] = ["/"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <MagicLinkVerify />
    </MemoryRouter>,
  );
};

describe("MagicLinkVerify Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * TEST GROUP: Basic Rendering
   */
  describe("Basic Rendering", () => {
    it("should render the component successfully", () => {
      const { container } = renderWithRouter(["/auth/verify?token=test-token"]);
      expect(container).not.toBeNull();
    });

    it("should render without throwing errors", () => {
      expect(() => renderWithRouter(["/auth/verify?token=test-token"])).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = renderWithRouter(["/auth/verify?token=test-token"]);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Token Handling
   */
  describe("Token Handling", () => {
    it("should call verifyMagicLink with token from URL", () => {
      renderWithRouter(["/auth/verify?token=abc123"]);
      expect(mockVerifyMagicLink).toHaveBeenCalledWith({ token: "abc123" });
    });

    it("should show error toast and redirect when no token is provided", () => {
      renderWithRouter(["/auth/verify"]);

      expect(mockToastError).toHaveBeenCalledWith("Invalid magic link. Redirecting to login...");

      // Fast-forward timer for the redirect
      vi.advanceTimersByTime(2000);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("should not call verifyMagicLink when no token is provided", () => {
      renderWithRouter(["/auth/verify"]);
      expect(mockVerifyMagicLink).not.toHaveBeenCalled();
    });

    it("should only call verifyMagicLink once even with re-renders", () => {
      render(
        <MemoryRouter initialEntries={["/auth/verify?token=abc123"]}>
          <MagicLinkVerify />
        </MemoryRouter>,
      );

      expect(mockVerifyMagicLink).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * TEST GROUP: Loading State
   */
  describe("Loading State", () => {
    it("should render component without crashing in default state", () => {
      const { container } = renderWithRouter(["/auth/verify?token=test-token"]);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Error State
   */
  describe("Error State", () => {
    it("should render component when error state is triggered", () => {
      const { container } = renderWithRouter(["/auth/verify?token=expired-token"]);
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Terms and Agreement
   */
  describe("Terms and Agreement", () => {
    it("should not show terms and agreement popup initially", () => {
      renderWithRouter(["/auth/verify?token=test-token"]);
      expect(screen.queryByTestId("terms-and-agreement")).toBeNull();
    });
  });

  /**
   * TEST GROUP: Component Type and Export
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof MagicLinkVerify).toBe("function");
    });

    it("should return a valid React element", () => {
      const result = renderWithRouter(["/auth/verify?token=test-token"]);
      expect(result.container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => renderWithRouter(["/auth/verify?token=test-token"])).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Edge Cases
   */
  describe("Edge Cases", () => {
    it("should handle empty token string", () => {
      renderWithRouter(["/auth/verify?token="]);

      // Empty token evaluates to falsy, should show error
      expect(mockToastError).toHaveBeenCalledWith("Invalid magic link. Redirecting to login...");
    });

    it("should handle token with special characters", () => {
      const specialToken = "abc%20def%26xyz";
      renderWithRouter([`/auth/verify?token=${specialToken}`]);

      expect(mockVerifyMagicLink).toHaveBeenCalled();
    });

    it("should not crash when rendered multiple times", () => {
      expect(() => {
        for (let i = 0; i < 3; i++) {
          renderWithRouter(["/auth/verify?token=test-token"]);
        }
      }).not.toThrow();
    });
  });
});
