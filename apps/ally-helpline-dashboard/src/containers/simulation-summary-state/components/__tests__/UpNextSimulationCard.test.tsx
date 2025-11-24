import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import { UpNextSimulationCard } from "../UpNextSimulationCard";
import { baseAPI } from "@api/baseAPI";

// Mock data for the upcoming simulation
const mockSimulationData = {
  id: "sim-123",
  simulationNumber: 2,
  title: "Hopeless Male, 40",
  description: "Test description",
  scenario:
    "A 40-year-old male is experiencing deep hopelessness. He feels overwhelmed by ongoing personal and professional failures, believes his situation won't improve, and is withdrawing socially. He's showing signs of resignation and low self-worth. Your goal is to explore his thoughts gently, offer validation, and begin rebuilding his sense of agency and hope.",
  coverImageUrl: "https://via.placeholder.com/120",
};

// Create a mock store with the API slice
const createMockStore = (mockData = mockSimulationData) => {
  return configureStore({
    reducer: {
      [baseAPI.reducerPath]: baseAPI.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(baseAPI.middleware),
    preloadedState: {
      [baseAPI.reducerPath]: {
        queries: {
          'getUpComingSimulation("test-chat-id")': {
            status: "fulfilled",
            endpointName: "getUpComingSimulation",
            requestId: "test-request-id",
            data: mockData,
            startedTimeStamp: Date.now(),
            fulfilledTimeStamp: Date.now(),
          },
        },
        mutations: {},
        provided: {},
        subscriptions: {},
        config: {
          online: true,
          focused: true,
          middlewareRegistered: true,
          refetchOnFocus: false,
          refetchOnReconnect: false,
          refetchOnMountOrArgChange: false,
          keepUnusedDataFor: 60,
          reducerPath: baseAPI.reducerPath,
        },
      },
    },
  });
};

// Test wrapper component with Redux Provider
const TestWrapper = ({
  children,
  store = createMockStore(),
}: {
  children: React.ReactNode;
  store?: any;
}) => <Provider store={store}>{children}</Provider>;

describe("UpNextSimulationCard", () => {
  const chatId = "test-chat-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render the simulation card with all elements", () => {
      const store = createMockStore();
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      expect(screen.getByText("Up next - Simulation 2")).toBeInTheDocument();
      const titleElements = screen.getAllByText("Hopeless Male, 40");
      expect(titleElements).toHaveLength(2); // Title appears twice in the component
      expect(screen.getByText("Scenario:")).toBeInTheDocument();
      expect(
        screen.getByText(/A 40-year-old male is experiencing deep hopelessness/),
      ).toBeInTheDocument();
    });

    it("should render the cover image with correct attributes", () => {
      const store = createMockStore();
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      const image = screen.getByAltText("Hopeless Male, 40");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://via.placeholder.com/120");
    });
  });

  describe("Props Handling", () => {
    it("should display correct simulation number", () => {
      const customData = { ...mockSimulationData, simulationNumber: 5 };
      const store = createMockStore(customData);
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      expect(screen.getByText("Up next - Simulation 5")).toBeInTheDocument();
    });

    it("should display custom title", () => {
      const customData = { ...mockSimulationData, title: "Custom Title" };
      const store = createMockStore(customData);
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      const titleElements = screen.getAllByText("Custom Title");
      expect(titleElements).toHaveLength(2); // Title appears twice in the component
    });

    it("should display custom scenario text", () => {
      const customScenario = "This is a custom scenario description.";
      const customData = { ...mockSimulationData, scenario: customScenario };
      const store = createMockStore(customData);
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      expect(screen.getByText(customScenario)).toBeInTheDocument();
    });

    it("should use custom cover image URL", () => {
      const customImageUrl = "https://example.com/custom-image.jpg";
      const customData = { ...mockSimulationData, coverImageUrl: customImageUrl };
      const store = createMockStore(customData);
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      const image = screen.getByAltText(customData.title);
      expect(image).toHaveAttribute("src", customImageUrl);
    });
  });

  describe("Styling", () => {
    it("should have correct container classes", () => {
      const store = createMockStore();
      const { container } = render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      const card = container.querySelector(".rounded-\\[8px\\]");
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass("rounded-[8px]", "border");
    });

    it("should have correct image dimensions", () => {
      const store = createMockStore();
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      const image = screen.getByAltText(mockSimulationData.title);
      expect(image).toHaveClass("w-[120px]", "h-[60px]", "rounded-[8px]", "object-cover");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty scenario text", () => {
      const customData = { ...mockSimulationData, scenario: "" };
      const store = createMockStore(customData);
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      expect(screen.getByText("Scenario:")).toBeInTheDocument();
    });

    it("should handle simulation number 0", () => {
      const customData = { ...mockSimulationData, simulationNumber: 0 };
      const store = createMockStore(customData);
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      expect(screen.getByText("Up next - Simulation 0")).toBeInTheDocument();
    });

    it("should handle long scenario text", () => {
      const longScenario = "A".repeat(500);
      const customData = { ...mockSimulationData, scenario: longScenario };
      const store = createMockStore(customData);
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      expect(screen.getByText(longScenario)).toBeInTheDocument();
    });

    it("should handle special characters in title", () => {
      const specialTitle = "Test & Title <with> 'Special' \"Characters\"";
      const customData = { ...mockSimulationData, title: specialTitle };
      const store = createMockStore(customData);
      render(
        <TestWrapper store={store}>
          <UpNextSimulationCard chatId={chatId} />
        </TestWrapper>,
      );

      const titleElements = screen.getAllByText(specialTitle);
      expect(titleElements).toHaveLength(2); // Title appears twice in the component
    });
  });
});
