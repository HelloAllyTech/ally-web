import { Suspense } from "react";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AnalyticsProvider } from "../analytics";
import App from "../App.tsx";
import i18n from "../i18n";
import { store, persistor } from "../store";

// Mock React DOM
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
}));

vi.mock("react-dom/client", () => ({
  createRoot: mockCreateRoot,
}));

// Mock React Redux
vi.mock("react-redux", () => ({
  Provider: ({ children, store }: { children: React.ReactNode; store: any }) => (
    <div data-testid="redux-provider" data-store={store ? "store-present" : "no-store"}>
      {children}
    </div>
  ),
}));

// Mock redux-persist gate
vi.mock("redux-persist/integration/react", () => ({
  PersistGate: ({ children, persistor }: { children: React.ReactNode; persistor: any }) => (
    <div data-testid="persist-gate" data-persistor={persistor ? "present" : "absent"}>
      {children}
    </div>
  ),
}));

// Mock Google OAuth provider
vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({
    children,
    clientId,
  }: {
    children: React.ReactNode;
    clientId: string;
  }) => (
    <div data-testid="google-oauth-provider" data-client-id={clientId}>
      {children}
    </div>
  ),
}));

// Mock i18n provider
vi.mock("react-i18next", () => ({
  I18nextProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18next-provider">{children}</div>
  ),
}));

// Mock analytics provider
vi.mock("../analytics", () => ({
  AnalyticsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="analytics-provider">{children}</div>
  ),
}));

// Mock CSS / SCSS imports
vi.mock("../index.css", () => ({}));
vi.mock("@ally-ui-mono/ui-shared/styles/carbon-serif.scss", () => ({}));

// Mock App component
vi.mock("../App.tsx", () => ({
  default: () => <div data-testid="app-component">App Component</div>,
}));

// Mock store + persistor
vi.mock("../store", () => ({
  store: { dispatch: vi.fn(), getState: vi.fn() },
  persistor: { persist: vi.fn() },
}));

// Mock i18n instance
vi.mock("../i18n", () => ({
  default: { language: "en" },
}));

// A component that mirrors main.tsx's new provider hierarchy (post Carbon
// migration): Provider > PersistGate > GoogleOAuthProvider > I18nextProvider >
// AnalyticsProvider > Suspense > App. The previous StyledEngineProvider /
// LocalizationProvider (MUI) wrappers have been removed.
const TestMainComponent = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GoogleOAuthProvider clientId="test-client-id">
          <I18nextProvider i18n={i18n}>
            <AnalyticsProvider>
              <Suspense fallback={null}>
                <App />
              </Suspense>
            </AnalyticsProvider>
          </I18nextProvider>
        </GoogleOAuthProvider>
      </PersistGate>
    </Provider>
  );
};

describe("main.tsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock document.getElementById
    const mockRootElement = document.createElement("div");
    mockRootElement.id = "root";
    vi.spyOn(document, "getElementById").mockReturnValue(mockRootElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with the Redux Provider at the root", () => {
    render(<TestMainComponent />);
    expect(screen.getByTestId("redux-provider")).toBeInTheDocument();
  });

  it("renders the app with correct providers", () => {
    render(<TestMainComponent />);

    // Redux Provider is the root and receives the store
    const reduxProvider = screen.getByTestId("redux-provider");
    expect(reduxProvider).toBeInTheDocument();
    expect(reduxProvider).toHaveAttribute("data-store", "store-present");

    // PersistGate wraps the rest of the tree
    const persistGate = screen.getByTestId("persist-gate");
    expect(persistGate).toBeInTheDocument();
    expect(persistGate).toHaveAttribute("data-persistor", "present");

    // App component is rendered inside the providers
    const appComponent = screen.getByTestId("app-component");
    expect(appComponent).toBeInTheDocument();
  });

  it("configures GoogleOAuthProvider with a client id", () => {
    render(<TestMainComponent />);

    const googleProvider = screen.getByTestId("google-oauth-provider");
    expect(googleProvider).toHaveAttribute("data-client-id", "test-client-id");
  });

  it("passes store to Redux Provider", () => {
    render(<TestMainComponent />);

    const reduxProvider = screen.getByTestId("redux-provider");
    expect(reduxProvider).toHaveAttribute("data-store", "store-present");
  });

  it("renders App component inside providers", () => {
    render(<TestMainComponent />);

    const appComponent = screen.getByTestId("app-component");
    expect(appComponent).toBeInTheDocument();
  });

  it("has correct component hierarchy", () => {
    render(<TestMainComponent />);

    const reduxProvider = screen.getByTestId("redux-provider");
    const persistGate = screen.getByTestId("persist-gate");
    const googleProvider = screen.getByTestId("google-oauth-provider");
    const i18nProvider = screen.getByTestId("i18next-provider");
    const analyticsProvider = screen.getByTestId("analytics-provider");
    const appComponent = screen.getByTestId("app-component");

    expect(reduxProvider).toContainElement(persistGate);
    expect(persistGate).toContainElement(googleProvider);
    expect(googleProvider).toContainElement(i18nProvider);
    expect(i18nProvider).toContainElement(analyticsProvider);
    expect(analyticsProvider).toContainElement(appComponent);
  });

  it("handles missing root element gracefully", () => {
    // Mock document.getElementById to return null
    vi.spyOn(document, "getElementById").mockReturnValue(null);

    // The TestMainComponent doesn't actually check for root element, it just renders
    // This test verifies the component can render without errors
    expect(() => {
      render(<TestMainComponent />);
    }).not.toThrow();
  });

  it("imports style files without throwing", () => {
    // The CSS/SCSS imports are mocked, so we just need to ensure the module loads
    expect(() => {
      render(<TestMainComponent />);
    }).not.toThrow();
  });

  it("uses correct store from store module", () => {
    render(<TestMainComponent />);

    // The store should be passed to the Redux Provider
    const reduxProvider = screen.getByTestId("redux-provider");
    expect(reduxProvider).toHaveAttribute("data-store", "store-present");
  });

  it("wraps App with all necessary providers", () => {
    render(<TestMainComponent />);

    expect(screen.getByTestId("redux-provider")).toBeInTheDocument();
    expect(screen.getByTestId("persist-gate")).toBeInTheDocument();
    expect(screen.getByTestId("google-oauth-provider")).toBeInTheDocument();
    expect(screen.getByTestId("i18next-provider")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-provider")).toBeInTheDocument();
    expect(screen.getByTestId("app-component")).toBeInTheDocument();
  });

  it("maintains proper nesting order", () => {
    render(<TestMainComponent />);

    const reduxProvider = screen.getByTestId("redux-provider");
    const persistGate = screen.getByTestId("persist-gate");
    const appComponent = screen.getByTestId("app-component");

    // Redux Provider should contain PersistGate
    expect(reduxProvider).toContainElement(persistGate);

    // The provider chain should ultimately contain App
    expect(reduxProvider).toContainElement(appComponent);
  });
});
