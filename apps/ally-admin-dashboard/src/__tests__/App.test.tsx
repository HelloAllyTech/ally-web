import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, beforeEach, vi } from "vitest";

import App from "../App";
import logsReducer from "@reducer/logsReducer";
import reportUploadReducer from "@reducer/reportUploadReducer";
import socketStatusReducer, { SocketConnectionStatus } from "@reducer/socketStatusReducer";

// Mock the API first to prevent baseAPI.injectEndpoints errors
vi.mock("@api/baseApi", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: {
      resetApiState: vi.fn(),
    },
  },
}));

// Mock all API modules
vi.mock("@api", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: {
      resetApiState: vi.fn(),
    },
  },
}));

// Mock RouteLayout component
vi.mock("@routes/RouteLayout", () => ({
  RouteLayout: () => <div data-testid="route-layout">RouteLayout</div>,
}));

// Mock LogViewer component
vi.mock("@components/log-viewer", () => ({
  LogViewer: () => <div data-testid="log-viewer">LogViewer</div>,
}));

// Mock useScenarioReportsSocket hook to prevent socket connection attempts
vi.mock("@hooks/useScenarioReportsSocket", () => ({
  useScenarioReportsSocket: () => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinUserReportsRoom: vi.fn(),
  }),
}));

// Mock sonner Toaster component
vi.mock("sonner", () => ({
  Toaster: ({
    position,
    richColors,
    toastOptions,
    style,
  }: {
    position: string;
    richColors: boolean;
    toastOptions: Record<string, unknown>;
    style: Record<string, unknown>;
  }) => (
    <div
      data-testid="toaster"
      data-position={position}
      data-rich-colors={richColors}
      data-toast-options={JSON.stringify(toastOptions)}
      data-style={JSON.stringify(style)}
    >
      Toaster
    </div>
  ),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Create a test store for Redux Provider
const createTestStore = () => {
  return configureStore({
    reducer: {
      reportUpload: reportUploadReducer.reducer,
      logs: logsReducer.reducer,
      socketStatus: socketStatusReducer.reducer,
    },
    preloadedState: {
      reportUpload: {
        uploads: [],
        currentScenarioId: undefined,
      },
      logs: {
        logs: [],
        isVisible: false,
      },
      socketStatus: {
        scenarioReportsSocket: {
          status: SocketConnectionStatus.DISCONNECTED,
          connectionAttempts: 0,
        },
      },
    },
  });
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    expect(screen.getByTestId("route-layout")).toBeInTheDocument();
  });

  it("renders RouteLayout component", () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    const routeLayout = screen.getByTestId("route-layout");
    expect(routeLayout).toBeInTheDocument();
    expect(routeLayout).toHaveTextContent("RouteLayout");
  });

  it("renders Toaster component", () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    const toaster = screen.getByTestId("toaster");
    expect(toaster).toBeInTheDocument();
    expect(toaster).toHaveTextContent("Toaster");
  });

  it("configures Toaster with correct position", () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    const toaster = screen.getByTestId("toaster");
    expect(toaster).toHaveAttribute("data-position", "bottom-right");
  });

  it("configures Toaster with richColors enabled", () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    const toaster = screen.getByTestId("toaster");
    expect(toaster).toHaveAttribute("data-rich-colors", "true");
  });

  it("configures Toaster with correct toast options", () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    const toaster = screen.getByTestId("toaster");
    const toastOptions = JSON.parse(toaster.getAttribute("data-toast-options") || "{}");

    expect(toastOptions).toHaveProperty("style");
    expect(toastOptions.style).toHaveProperty("transform", "translateZ(0)");
    expect(toastOptions.style).toHaveProperty("willChange", "transform");
  });

  it("configures Toaster with correct style prop", () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    const toaster = screen.getByTestId("toaster");
    const style = JSON.parse(toaster.getAttribute("data-style") || "{}");

    expect(style).toHaveProperty("transform", "translateZ(0)");
    expect(style).toHaveProperty("willChange", "transform");
  });

  it("renders both RouteLayout and Toaster in the same component", () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    expect(screen.getByTestId("route-layout")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("exports App as default export", () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");
  });
});
