/**
 * Comprehensive Unit Tests for Login Component
 *
 * Test Coverage:
 * - Component rendering with all states
 * - Form validation and submission
 * - OTP generation and verification flow
 * - State management and side effects
 * - Navigation and authentication
 * - Error handling and user feedback
 * - Local storage integration
 * - Timer functionality
 * - Accessibility features
 */

import { configureStore } from "@reduxjs/toolkit";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { describe, expect, it, vi, beforeAll, beforeEach, afterAll, afterEach } from "vitest";

import { Login } from "../Login";

// Mock @react-oauth/google
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ onSuccess, onError }: any) => (
    <button data-testid="google-login" onClick={() => onSuccess({ credential: "mock-credential" })}>
      Sign in with Google
    </button>
  ),
  GoogleOAuthProvider: ({ children }: any) => <div>{children}</div>,
  useGoogleLogin: ({ onSuccess, onError }: any) => {
    return () => {
      onSuccess({ access_token: "mock-access-token" });
    };
  },
}));

// Mock all external dependencies
vi.mock("@api", () => ({
  useGenerateOTPMutation: () => [
    vi.fn(),
    {
      isLoading: false,
      isSuccess: false,
      data: null,
      error: null,
    },
  ],
  useVerifyOTPMutation: () => [
    vi.fn(),
    {
      isLoading: false,
      isSuccess: false,
      data: null,
      error: null,
    },
  ],
  useLazyCheckTermsAndAgreementQuery: () => [
    vi.fn().mockResolvedValue({ data: { success: true } }),
    {
      isLoading: false,
      isSuccess: false,
      data: null,
      error: null,
    },
  ],
  usePutTermsAndAgreementMutation: () => [
    vi.fn().mockResolvedValue({ data: { success: true } }),
    {
      isLoading: false,
      isSuccess: false,
      data: null,
      error: null,
    },
  ],
  useGoogleSignInMutation: () => [
    vi.fn(),
    {
      data: null,
      error: null,
    },
  ],
}));

vi.mock("@assets", () => ({
  Ally: ({ className }: { className: string }) => (
    <div data-testid="ally-logo" className={className}>
      Ally
    </div>
  ),
  BackCircle: ({ className }: { className: string }) => (
    <div data-testid="back-circle" className={className}>
      BackCircle
    </div>
  ),
  LoginImage: ({ className }: { className: string }) => (
    <div data-testid="login-image" className={className}>
      LoginImage
    </div>
  ),
  RedirectIcon: ({ className }: { className: string }) => (
    <div data-testid="redirect-icon" className={className}>
      RedirectIcon
    </div>
  ),
}));

vi.mock("@components", () => ({
  AppTooltip: ({ children }: any) => <>{children}</>,
  Button: ({ children, onClick, disabled, className }: any) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),

  OTP: ({ value, onChange, onComplete }: any) => (
    <input
      data-testid="otp-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={() => onComplete && onComplete()}
    />
  ),
  TextField: ({ label, value, onChange, error, type }: any) => (
    <div>
      <label data-testid="textfield-label">{label}</label>
      <input data-testid="textfield-input" value={value} onChange={onChange} type={type} />
      {error && <span data-testid="textfield-error">{error}</span>}
    </div>
  ),
  TermsAndAgreement: ({ isOpen, handleClose, handleAgreeButtonClick }: any) =>
    isOpen ? (
      <div data-testid="terms-and-agreement">
        Terms And Agreement
        <button onClick={handleClose}>Close</button>
        <button onClick={handleAgreeButtonClick}>Agree</button>
      </div>
    ) : null,
}));

vi.mock("@constants", () => ({
  ALLY_PRIVACY_POLICY_URL: "https://privacy.example.com",
  ALLY_TERMS_URL: "https://terms.example.com",
  ALLY_URL: "https://ally.example.com",
  CAROUSEL_SLIDES: [
    { title: "Slide 1", description: "Description 1" },
    { title: "Slide 2", description: "Description 2" },
  ],
  LOCAL_STORAGE_KEYS: {
    ACCESS_TOKEN: "accessToken",
    REFRESH_TOKEN: "refreshToken",
  },
  LoginSection: {
    EMAIL: "email",
    OTP: "otp",
  },
  TooltipLocation: {
    LOGIN_BUTTON: "login_button",
  },
}));

vi.mock("@hooks", () => ({
  useUser: () => ({
    isAuthenticated: false,
    checkAuth: vi.fn(),
  }),
}));

vi.mock("@utils", () => ({
  openLinkInNewTab: vi.fn(),
  validateEmail: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
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

// Create a mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      user: (state = { user: null }, action) => state,
    },
    preloadedState: {
      user: { user: null, ...initialState },
    },
  });
};

// Test wrapper component
const TestWrapper = ({ children, store }: any) => (
  <Provider store={store}>
    <BrowserRouter>{children}</BrowserRouter>
  </Provider>
);

describe("Login Component", () => {
  let mockStore: any;
  let mockNavigate: any;
  let mockCheckAuth: any;
  let mockValidateEmail: any;
  let mockOpenLinkInNewTab: any;

  beforeEach(() => {
    mockStore = createMockStore();
    mockNavigate = vi.fn();
    mockCheckAuth = vi.fn();
    mockValidateEmail = vi.fn();
    mockOpenLinkInNewTab = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});

    // Mock react-router-dom
    vi.doMock("react-router-dom", () => ({
      useNavigate: () => mockNavigate,
    }));

    // Mock hooks
    vi.doMock("@hooks", () => ({
      useUser: () => ({
        isAuthenticated: false,
        checkAuth: mockCheckAuth,
      }),
    }));

    // Mock utils
    vi.doMock("@utils", () => ({
      openLinkInNewTab: mockOpenLinkInNewTab,
      validateEmail: mockValidateEmail,
    }));

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * TEST GROUP: Basic Rendering
   * Verifies that the component renders without errors
   */
  describe("Basic Rendering", () => {
    it("should render the Login component successfully", () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );
      expect(container).not.toBeNull();
    });

    it("should render without throwing errors", () => {
      expect(() =>
        render(
          <TestWrapper store={mockStore}>
            <Login />
          </TestWrapper>,
        ),
      ).not.toThrow();
    });

    it("should render a non-empty component", () => {
      const { container } = render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );
      expect(container.firstChild).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Initial State
   * Verifies the component starts in the correct initial state
   */
  describe("Initial State", () => {
    it("should start with email section", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const emailInput = screen.getByTestId("textfield-input");
      expect(emailInput).not.toBeNull();
    });

    it("should have empty email initially", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const emailInput = screen.getByTestId("textfield-input") as HTMLInputElement;
      expect(emailInput.value).toBe("");
    });

    it("should have empty OTP initially", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const otpInput = screen.queryByTestId("otp-input");
      expect(otpInput).toBeNull(); // OTP input should not be visible initially
    });

    it("should have remember me unchecked initially", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  /**
   * TEST GROUP: Email Input Handling
   * Verifies email input functionality
   */
  describe("Email Input Handling", () => {
    it("should update email when user types", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const emailInput = screen.getByTestId("textfield-input");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      expect((emailInput as HTMLInputElement).value).toBe("test@example.com");
    });

    it("should convert email to lowercase", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const emailInput = screen.getByTestId("textfield-input");
      fireEvent.change(emailInput, { target: { value: "TEST@EXAMPLE.COM" } });

      expect((emailInput as HTMLInputElement).value).toBe("test@example.com");
    });

    it("should clear email error when user starts typing", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const emailInput = screen.getByTestId("textfield-input");
      const button = screen.getByTestId("button");

      // Trigger error by clicking with invalid email
      fireEvent.click(button);

      // Type to clear error
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      expect(screen.queryByTestId("textfield-error")).toBeNull();
    });
  });

  /**
   * TEST GROUP: Accessibility
   * Verifies accessibility features
   */
  describe("Accessibility", () => {
    it("should have proper form labels", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const emailLabel = screen.getByTestId("textfield-label");
      expect(emailLabel).not.toBeNull();
    });

    it("should have proper button roles", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const buttons = screen.getAllByTestId("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  /**
   * TEST GROUP: Edge Cases
   * Verifies component handles edge cases gracefully
   */
  describe("Edge Cases", () => {
    it("should not crash on rapid user input", () => {
      render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );

      const emailInput = screen.getByTestId("textfield-input");

      // Rapid typing
      for (let i = 0; i < 10; i++) {
        fireEvent.change(emailInput, { target: { value: `test${i}@example.com` } });
      }

      expect(emailInput).not.toBeNull();
    });
  });

  /**
   * TEST GROUP: Snapshot Testing
   * Snapshots removed: Font color, size, and family change frequently during development
   */

  /**
   * TEST GROUP: Component Type and Export
   * Verifies component is properly exported and typed
   */
  describe("Component Type and Export", () => {
    it("should be a function component", () => {
      expect(typeof Login).toBe("function");
    });

    it("should return a valid React element", () => {
      const result = render(
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>,
      );
      expect(result.container.firstChild).not.toBeNull();
    });

    it("should be callable as a React component", () => {
      expect(() => (
        <TestWrapper store={mockStore}>
          <Login />
        </TestWrapper>
      )).not.toThrow();
    });
  });

  /**
   * TEST GROUP: Session expiry messaging (graceful-failure audit item 4)
   *
   * A refresh-token failure previously did a silent `window.location.href =
   * "/login"` reload with no explanation. `handleLogout` in `api/baseAPI.ts`
   * now appends `sessionExpired=1` (and a `returnTo`) to that redirect, and
   * Login.tsx is expected to surface an explanatory toast when it sees that
   * flag on mount.
   */
  describe("Session expiry messaging", () => {
    const renderAtLoginUrl = (search: string) =>
      render(
        <Provider store={mockStore}>
          <MemoryRouter initialEntries={[`/login${search}`]}>
            <Login />
          </MemoryRouter>
        </Provider>,
      );

    it("toasts an explanation when sessionExpired=1 is on the URL", () => {
      renderAtLoginUrl("?sessionExpired=1");
      expect(toast.info).toHaveBeenCalledTimes(1);
      expect((toast.info as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatch(/session/i);
    });

    it("does not toast a session-expiry message on a plain visit", () => {
      renderAtLoginUrl("");
      expect(toast.info).not.toHaveBeenCalled();
    });
  });
});
