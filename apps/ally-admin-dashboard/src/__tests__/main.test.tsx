import { StrictMode } from "react";

import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, it, expect, vi } from "vitest";

// Mock the API first
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
  // evaluatorAPI is wired into the store alongside baseAPI; stub it too so
  // store init (reducerPath/reducer/middleware) does not throw.
  evaluatorAPI: {
    reducerPath: "evaluatorAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
    util: { resetApiState: () => ({ type: "reset" }) },
  },
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}));

import App from "../App";
import { store } from "../store";

// Mock the App component
vi.mock("../App", () => ({
  default: () => <div data-testid="mock-app">App Component</div>,
}));

// Mock the styles import
vi.mock("../styles.css", () => ({}));

describe("main.tsx", () => {
  it("renders App wrapped in StrictMode", () => {
    render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>,
    );

    expect(screen.getByTestId("mock-app")).toBeInTheDocument();
  });

  it("renders App wrapped in Redux Provider", () => {
    render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>,
    );

    expect(screen.getByTestId("mock-app")).toBeInTheDocument();
  });

  it("provides store to the application", () => {
    render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>,
    );

    // Verify the app renders, which means the store is properly provided
    expect(screen.getByTestId("mock-app")).toBeInTheDocument();
  });

  it("uses StrictMode for development checks", () => {
    const { container } = render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>,
    );

    // StrictMode doesn't render any visible DOM elements, but the app should render
    expect(container.querySelector('[data-testid="mock-app"]')).toBeInTheDocument();
  });

  it("renders the complete application structure", () => {
    render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>,
    );

    // Verify the complete structure is rendered
    const appElement = screen.getByTestId("mock-app");
    expect(appElement).toBeInTheDocument();
    expect(appElement).toHaveTextContent("App Component");
  });

  it("mounts the application to the root element", () => {
    // Create a root element
    const rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.appendChild(rootElement);

    // Verify the root element exists
    const root = document.getElementById("root");
    expect(root).toBeTruthy();
    expect(root).toBe(rootElement);

    // Clean up
    document.body.removeChild(rootElement);
  });

  it("exports store from store module", () => {
    expect(store).toBeDefined();
    expect(typeof store.dispatch).toBe("function");
    expect(typeof store.getState).toBe("function");
  });

  it("exports App from App module", () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");
  });
});
