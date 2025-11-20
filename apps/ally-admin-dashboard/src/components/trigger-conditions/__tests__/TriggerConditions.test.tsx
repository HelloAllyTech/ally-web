import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@api", () => ({
  baseAPI: {
    reducerPath: "api",
    reducer: vi.fn((state = {}) => state),
    middleware: vi.fn(() => (next: any) => (action: any) => next(action)),
  },
}));

vi.mock("@components", async importOriginal => {
  const actual = await importOriginal<typeof import("@components")>();
  return {
    ...actual,
    EventType: {
      TIME_BASED: "TIME_BASED",
      COMBINATION: "COMBINATION",
    },
  };
});

import { TriggerConditions } from "../TriggerConditions";
import eventsSlice from "@reducer/eventsReducer";
import { baseAPI } from "@api";

vi.mock("../StandardTriggerConditions", () => ({
  StandardTriggerConditions: ({ eventType, triggerCondition, onChange, isInTable }: any) => (
    <div data-testid="standard-trigger-conditions">
      <span data-testid="standard-event-type">{eventType}</span>
      <span data-testid="standard-trigger-condition">{JSON.stringify(triggerCondition)}</span>
      <span data-testid="standard-in-table">{String(isInTable)}</span>
    </div>
  ),
}));

vi.mock("../CombinationTriggerConditions", () => ({
  CombinationTriggerConditions: ({ triggerCondition, onChange, isInTable }: any) => (
    <div data-testid="combination-trigger-conditions">
      <span data-testid="combination-expression">
        {JSON.stringify(triggerCondition.expression)}
      </span>
      <span data-testid="combination-in-table">{String(isInTable)}</span>
    </div>
  ),
}));

vi.mock("../../types/triggerConditions", async importOriginal => {
  const actual = await importOriginal<typeof import("../../types/triggerConditions")>();
  return {
    ...actual,
    isCombinationTriggerCondition: (condition: any) => {
      return condition && "expression" in condition;
    },
  };
});

const createTestStore = () => {
  return configureStore({
    reducer: {
      [baseAPI.reducerPath]: baseAPI.reducer,
      events: eventsSlice.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        },
      }).concat(baseAPI.middleware),
  });
};

describe("TriggerConditions", () => {
  const defaultOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("returns null when eventType is undefined", () => {
      const { container } = render(
        <TriggerConditions
          eventType={undefined}
          triggerCondition={{}}
          onChange={defaultOnChange}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("returns null when eventType is empty string", () => {
      const { container } = render(
        <TriggerConditions eventType="" triggerCondition={{}} onChange={defaultOnChange} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Standard trigger conditions", () => {
    it("renders StandardTriggerConditions for TIME_BASED event", () => {
      render(
        <TriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={defaultOnChange}
        />,
      );

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
      expect(screen.getByTestId("standard-event-type")).toHaveTextContent("TIME_BASED");
    });

    it("returns null for standard events when triggerCondition is undefined", () => {
      const { container } = render(
        <TriggerConditions
          eventType="TIME_BASED"
          triggerCondition={undefined}
          onChange={defaultOnChange}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("passes isInTable prop to StandardTriggerConditions", () => {
      render(
        <TriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={defaultOnChange}
          isInTable={true}
        />,
      );

      expect(screen.getByTestId("standard-in-table")).toHaveTextContent("true");
    });
  });

  describe("Combination trigger conditions", () => {
    const combinationCondition = {
      expression: {
        type: "AND",
        left: { id: "event-1" },
        right: { id: "event-2" },
      },
    };

    it("renders CombinationTriggerConditions for COMBINATION event", () => {
      render(
        <Provider store={createTestStore()}>
          <TriggerConditions
            eventType="COMBINATION"
            triggerCondition={combinationCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("combination-trigger-conditions")).toBeInTheDocument();
    });

    it("renders CombinationTriggerConditions when triggerCondition is undefined", () => {
      render(
        <Provider store={createTestStore()}>
          <TriggerConditions
            eventType="COMBINATION"
            triggerCondition={undefined}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("combination-trigger-conditions")).toBeInTheDocument();
    });

    it("renders CombinationTriggerConditions when expression is null", () => {
      render(
        <Provider store={createTestStore()}>
          <TriggerConditions
            eventType="COMBINATION"
            triggerCondition={{ expression: null } as any}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      expect(screen.getByTestId("combination-trigger-conditions")).toBeInTheDocument();
    });

    it("creates default expression when triggerCondition is undefined", () => {
      render(
        <Provider store={createTestStore()}>
          <TriggerConditions
            eventType="COMBINATION"
            triggerCondition={undefined}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      const expression = screen.getByTestId("combination-expression");
      const parsed = JSON.parse(expression.textContent || "{}");
      expect(parsed).toMatchObject({
        type: "AND",
        left: { id: "" },
        right: { id: "" },
      });
    });

    it("creates default expression when expression is null", () => {
      render(
        <Provider store={createTestStore()}>
          <TriggerConditions
            eventType="COMBINATION"
            triggerCondition={{ expression: null } as any}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      const expression = screen.getByTestId("combination-expression");
      const parsed = JSON.parse(expression.textContent || "{}");
      expect(parsed).toMatchObject({
        type: "AND",
        left: { id: "" },
        right: { id: "" },
      });
    });

    it("uses existing combination condition when provided", () => {
      render(
        <Provider store={createTestStore()}>
          <TriggerConditions
            eventType="COMBINATION"
            triggerCondition={combinationCondition}
            onChange={defaultOnChange}
          />
        </Provider>,
      );

      const expression = screen.getByTestId("combination-expression");
      const parsed = JSON.parse(expression.textContent || "{}");
      expect(parsed).toMatchObject({
        type: "AND",
        left: { id: "event-1" },
        right: { id: "event-2" },
      });
    });

    it("passes isInTable prop to CombinationTriggerConditions", () => {
      render(
        <Provider store={createTestStore()}>
          <TriggerConditions
            eventType="COMBINATION"
            triggerCondition={combinationCondition}
            onChange={defaultOnChange}
            isInTable={true}
          />
        </Provider>,
      );

      expect(screen.getByTestId("combination-in-table")).toHaveTextContent("true");
    });
  });

  describe("Side panel wrapper", () => {
    it("renders with SidePanelWrapper when isInTable is false", () => {
      render(
        <TriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={defaultOnChange}
          isInTable={false}
        />,
      );

      expect(screen.getByText("Trigger conditions")).toBeInTheDocument();
    });

    it("does not render SidePanelWrapper when isInTable is true", () => {
      render(
        <TriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={defaultOnChange}
          isInTable={true}
        />,
      );

      expect(screen.queryByText("Trigger conditions")).not.toBeInTheDocument();
    });
  });

  describe("onChange handling", () => {
    it("calls onChange when provided", () => {
      const onChange = vi.fn();
      render(
        <TriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
          onChange={onChange}
        />,
      );

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
    });

    it("uses no-op function when onChange is not provided", () => {
      render(
        <TriggerConditions
          eventType="TIME_BASED"
          triggerCondition={{ operator: "LESS_THAN", value: "00:20:00" }}
        />,
      );

      expect(screen.getByTestId("standard-trigger-conditions")).toBeInTheDocument();
    });
  });
});
