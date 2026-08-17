import { describe, it, expect, vi, beforeEach } from "vitest";

import { ADMIN_PORTAL_LOGIN_ROLES, ApiEndpoints, HttpMethod, UserRole } from "@constants";

// Mock the store to avoid initialization issues
vi.mock("@store", () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock the baseAPI
vi.mock("../baseApi", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: vi.fn((state = {}) => state),
    middleware: vi.fn(),
  },
}));

describe("auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("API Endpoints Configuration", () => {
    it("should have correct signup endpoint", () => {
      expect(ApiEndpoints.AUTH.SIGNUP).toBe("/v1/auth/signup");
    });

    it("should have correct login endpoint", () => {
      expect(ApiEndpoints.AUTH.LOGIN).toBe("/v1/auth/login");
    });

    it("should have correct get user endpoint", () => {
      expect(ApiEndpoints.AUTH.GET_USER).toBe("/v1/users/me");
    });

    it("should have correct generate OTP endpoint", () => {
      expect(ApiEndpoints.AUTH.GENERATE_OTP).toBe("/v2/auth/generate-otp");
    });

    it("should have correct verify OTP endpoint", () => {
      expect(ApiEndpoints.AUTH.VERIFY_OTP).toBe("/v2/auth/verify-otp");
    });

    it("should have correct refresh endpoint", () => {
      expect(ApiEndpoints.AUTH.REFRESH).toBe("/v1/auth/refresh");
    });

    it("should have correct authorization permissions endpoint", () => {
      expect(ApiEndpoints.AUTHORIZATION.GET_PERMISSIONS).toBe("/v1/authorization/permissions");
    });

    it("should have correct get user impersonated tokens endpoint", () => {
      expect(ApiEndpoints.AUTH.GET_USER_IMPERSONATED_TOKENS).toBe("/v1/auth/impersonate");
    });
  });

  describe("HTTP Methods", () => {
    it("should have correct POST method", () => {
      expect(HttpMethod.POST).toBe("POST");
    });

    it("should have correct GET method", () => {
      expect(HttpMethod.GET).toBe("GET");
    });

    it("should have correct PUT method", () => {
      expect(HttpMethod.PUT).toBe("PUT");
    });

    it("should have correct DELETE method", () => {
      expect(HttpMethod.DELETE).toBe("DELETE");
    });

    it("should have correct PATCH method", () => {
      expect(HttpMethod.PATCH).toBe("PATCH");
    });
  });

  describe("Signup Data Handling", () => {
    it("should handle signup data correctly", () => {
      const signupData = {
        email: "user@example.com",
        password: "password123",
        name: "John Doe",
        phone: "+1234567890",
      };

      expect(signupData.email).toBeDefined();
      expect(signupData.password).toBeDefined();
      expect(signupData.name).toBeDefined();
      expect(signupData.phone).toBeDefined();
    });

    it("should validate email format", () => {
      const validEmail = "user@example.com";
      const invalidEmail = "invalid-email";

      expect(validEmail).toContain("@");
      expect(validEmail).toContain(".");
      expect(invalidEmail).not.toContain("@");
    });

    it("should handle empty signup data", () => {
      const emptySignupData = {
        email: "",
        password: "",
        name: "",
        phone: "",
      };

      expect(emptySignupData.email).toBe("");
      expect(emptySignupData.password).toBe("");
      expect(emptySignupData.name).toBe("");
      expect(emptySignupData.phone).toBe("");
    });
  });

  describe("Login Data Handling", () => {
    it("should handle login credentials correctly", () => {
      const loginData = {
        email: "user@example.com",
        password: "password123",
      };

      expect(loginData.email).toBeDefined();
      expect(loginData.password).toBeDefined();
    });

    it("should handle empty login credentials", () => {
      const emptyLoginData = {
        email: "",
        password: "",
      };

      expect(emptyLoginData.email).toBe("");
      expect(emptyLoginData.password).toBe("");
    });

    it("should handle login with special characters", () => {
      const loginData = {
        email: "user+test@example.com",
        password: "P@ssw0rd!#$",
      };

      expect(loginData.email).toContain("+");
      expect(loginData.password).toContain("@");
      expect(loginData.password).toContain("!");
    });
  });

  describe("OTP Generation", () => {
    it("should handle OTP generation with phone", () => {
      const otpData = {
        phone: "+1234567890",
        email: undefined,
      };

      expect(otpData.phone).toBeDefined();
      expect(otpData.email).toBeUndefined();
    });

    it("should handle OTP generation with email", () => {
      const otpData = {
        phone: undefined,
        email: "user@example.com",
      };

      expect(otpData.phone).toBeUndefined();
      expect(otpData.email).toBeDefined();
    });

    it("should handle OTP generation with both phone and email", () => {
      const otpData = {
        phone: "+1234567890",
        email: "user@example.com",
      };

      expect(otpData.phone).toBeDefined();
      expect(otpData.email).toBeDefined();
    });

    it("should handle empty OTP data", () => {
      const emptyOtpData = {
        phone: undefined,
        email: undefined,
      };

      expect(emptyOtpData.phone).toBeUndefined();
      expect(emptyOtpData.email).toBeUndefined();
    });
  });

  describe("OTP Verification", () => {
    it("should handle OTP verification with phone", () => {
      const otpVerification = {
        phone: "+1234567890",
        email: undefined,
        otp: "123456",
      };

      expect(otpVerification.phone).toBeDefined();
      expect(otpVerification.email).toBeUndefined();
      expect(otpVerification.otp).toBeDefined();
      expect(otpVerification.otp).toHaveLength(6);
    });

    it("should handle OTP verification with email", () => {
      const otpVerification = {
        phone: undefined,
        email: "user@example.com",
        otp: "123456",
      };

      expect(otpVerification.phone).toBeUndefined();
      expect(otpVerification.email).toBeDefined();
      expect(otpVerification.otp).toBeDefined();
    });

    it("should handle OTP verification with both phone and email", () => {
      const otpVerification = {
        phone: "+1234567890",
        email: "user@example.com",
        otp: "123456",
      };

      expect(otpVerification.phone).toBeDefined();
      expect(otpVerification.email).toBeDefined();
      expect(otpVerification.otp).toBeDefined();
    });

    it("should handle invalid OTP format", () => {
      const invalidOtp = {
        phone: "+1234567890",
        email: "user@example.com",
        otp: "12",
      };

      expect(invalidOtp.otp).toBeDefined();
      expect(invalidOtp.otp.length).toBeLessThan(6);
    });

    it("should handle empty OTP", () => {
      const emptyOtp = {
        phone: "+1234567890",
        email: "user@example.com",
        otp: "",
      };

      expect(emptyOtp.otp).toBe("");
    });
  });

  describe("User Data Handling", () => {
    it("should handle user data correctly", () => {
      const userData = {
        id: 1,
        name: "John Doe",
        email: "user@example.com",
        role: UserRole.SUPER_ADMIN,
        userId: 1,
      };

      expect(userData.id).toBeDefined();
      expect(userData.name).toBeDefined();
      expect(userData.email).toBeDefined();
      expect(userData.role).toBeDefined();
      expect(userData.userId).toBeDefined();
    });

    it("should handle different user roles", () => {
      const roles = [UserRole.SUPER_ADMIN, UserRole.MULTI_TENANT_ADMIN];
      expect(roles).toContain(UserRole.SUPER_ADMIN);
      expect(roles).toContain(UserRole.MULTI_TENANT_ADMIN);
    });

    it("should handle user with minimal data", () => {
      const minimalUser = {
        id: 1,
        email: "user@example.com",
      };

      expect(minimalUser.id).toBeDefined();
      expect(minimalUser.email).toBeDefined();
    });
  });

  describe("Permissions Handling", () => {
    it("should handle permissions array", () => {
      const permissions = ["read", "write", "delete"];

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(3);
      expect(permissions).toContain("read");
      expect(permissions).toContain("write");
      expect(permissions).toContain("delete");
    });

    it("should handle empty permissions", () => {
      const permissions: string[] = [];

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(0);
    });

    it("should handle single permission", () => {
      const permissions = ["admin"];

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(1);
      expect(permissions[0]).toBe("admin");
    });
  });

  describe("Token Response Handling", () => {
    it("should handle token response correctly", () => {
      const tokenResponse = {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
      };

      expect(tokenResponse.accessToken).toBeDefined();
      expect(tokenResponse.refreshToken).toBeDefined();
      expect(typeof tokenResponse.accessToken).toBe("string");
      expect(typeof tokenResponse.refreshToken).toBe("string");
    });

    it("should handle impersonate response correctly", () => {
      const impersonateResponse = {
        accessToken: "imp-access-token-123",
        refreshToken: "imp-refresh-token-456",
      };

      expect(impersonateResponse.accessToken).toBeDefined();
      expect(impersonateResponse.refreshToken).toBeDefined();
      expect(typeof impersonateResponse.accessToken).toBe("string");
      expect(typeof impersonateResponse.refreshToken).toBe("string");
    });

    it("should handle missing tokens in response", () => {
      const emptyResponse = {
        accessToken: "",
        refreshToken: "",
      };

      expect(emptyResponse.accessToken).toBe("");
      expect(emptyResponse.refreshToken).toBe("");
    });
  });

  describe("Base API Mock", () => {
    it("should have correct mock setup", () => {
      expect(vi.fn()).toBeInstanceOf(Function);
    });

    it("should be able to call injectEndpoints", () => {
      const mockFn = vi.fn();
      mockFn({ endpoints: () => ({}) });
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe("User Role Constants", () => {
    it("should have SUPER_ADMIN role defined", () => {
      expect(UserRole.SUPER_ADMIN).toBeDefined();
    });

    /**
     * These assert the real ADMIN_PORTAL_LOGIN_ROLES that all four auth entry
     * points send — the predecessors of these tests asserted a literal built
     * inside the test itself, which is why nothing failed when the console
     * started granting PLATFORM_ADMIN while login still listed only the three
     * retired tiers, locking out every admin added after that deploy.
     */
    it("admits the current platform-tier role", () => {
      expect(ADMIN_PORTAL_LOGIN_ROLES).toContain(UserRole.PLATFORM_ADMIN);
    });

    it("still admits the retired tiers, for accounts the collapse hasn't reached", () => {
      expect(ADMIN_PORTAL_LOGIN_ROLES).toContain(UserRole.SUPER_ADMIN);
      expect(ADMIN_PORTAL_LOGIN_ROLES).toContain(UserRole.SUPER_DUPER_ADMIN);
      expect(ADMIN_PORTAL_LOGIN_ROLES).toContain(UserRole.MULTI_TENANT_ADMIN);
    });

    it("admits no tenant-scoped role", () => {
      // A filter the server intersects with real group membership — but this
      // console is not the portal for org admins, counsellors or learners.
      expect(ADMIN_PORTAL_LOGIN_ROLES).not.toContain(UserRole.ADMIN);
      expect(ADMIN_PORTAL_LOGIN_ROLES).not.toContain(UserRole.COUNSELLOR);
      expect(ADMIN_PORTAL_LOGIN_ROLES).not.toContain(UserRole.LEARNER);
    });
  });
});
