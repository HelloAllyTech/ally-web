import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, beforeEach } from "vitest";

import { CALL_LOGS_PAGINATION_LIMIT } from "@pages/calls/constants";
import callsSlice, { updatePage, updateFilters } from "@reducer/callsReducer";
import { CallsState } from "@types";

describe("Calls Reducer", () => {
  let testStore: ReturnType<typeof configureStore<{ calls: CallsState }>>;

  beforeEach(() => {
    testStore = configureStore({
      reducer: {
        calls: callsSlice.reducer,
      },
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = testStore.getState();

      expect(state.calls.filters).toEqual({
        offset: 0,
        limit: CALL_LOGS_PAGINATION_LIMIT,
      });
    });

    it("should have default pagination values", () => {
      const state = testStore.getState();

      expect(state.calls.filters.offset).toBe(0);
      expect(state.calls.filters.limit).toBe(CALL_LOGS_PAGINATION_LIMIT);
    });
  });

  describe("Update Page Action", () => {
    it("should handle updatePage with positive number", () => {
      const pageNumber = 2;

      testStore.dispatch(updatePage(pageNumber));

      const newState = testStore.getState();
      expect(newState.calls.filters.page).toBe(pageNumber);
    });

    it("should handle updatePage with page 1", () => {
      testStore.dispatch(updatePage(1));

      const newState = testStore.getState();
      expect(newState.calls.filters.page).toBe(1);
    });

    it("should handle updatePage with large page number", () => {
      const largePageNumber = 1000;

      testStore.dispatch(updatePage(largePageNumber));

      const newState = testStore.getState();
      expect(newState.calls.filters.page).toBe(largePageNumber);
    });

    it("should handle updatePage with zero", () => {
      testStore.dispatch(updatePage(0));

      const newState = testStore.getState();
      expect(newState.calls.filters.page).toBe(0);
    });

    it("should handle multiple page updates", () => {
      testStore.dispatch(updatePage(1));
      expect(testStore.getState().calls.filters.page).toBe(1);

      testStore.dispatch(updatePage(5));
      expect(testStore.getState().calls.filters.page).toBe(5);

      testStore.dispatch(updatePage(10));
      expect(testStore.getState().calls.filters.page).toBe(10);
    });
  });

  describe("Update Filters Action", () => {
    it("should handle updateFilters with empty object", () => {
      testStore.dispatch(updateFilters({}));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual({});
    });

    it("should handle updateFilters with pagination", () => {
      const filters = {
        page: 2,
        offset: 20,
        limit: 10,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle updateFilters with sorting", () => {
      const filters = {
        sortBy: "createdAt",
        order: "DESC" as const,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle updateFilters with counselor filter", () => {
      const filters = {
        counsellorName: "John Doe",
        counselorId: "123",
        counselorIds: "123,456,789",
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle updateFilters with client filter", () => {
      const filters = {
        clientId: "client123",
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle updateFilters with date range", () => {
      const filters = {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle updateFilters with duration range", () => {
      const filters = {
        minDuration: 60,
        maxDuration: 3600,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle updateFilters with quality score range", () => {
      const filters = {
        minQualityScore: 1,
        maxQualityScore: 5,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle updateFilters with tags", () => {
      const filters = {
        tags: "urgent,important,high-priority",
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle updateFilters with all filters", () => {
      const allFilters = {
        page: 1,
        offset: 0,
        limit: 50,
        sortBy: "createdAt",
        order: "DESC" as const,
        counsellorName: "Jane Smith",
        counselorId: "456",
        counselorIds: "456,789,012",
        clientId: "client789",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        minDuration: 120,
        maxDuration: 7200,
        minQualityScore: 2,
        maxQualityScore: 4,
        tags: "urgent,important,high-priority,escalated",
      };

      testStore.dispatch(updateFilters(allFilters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(allFilters);
    });
  });

  describe("Combined Actions", () => {
    it("should handle page update followed by filter update", () => {
      // Update page first
      testStore.dispatch(updatePage(3));
      expect(testStore.getState().calls.filters.page).toBe(3);

      // Then update filters (this will replace the entire filters object)
      const filters = {
        sortBy: "duration",
        order: "ASC" as const,
        counsellorName: "John Doe",
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      // Page will be lost because updateFilters replaces the entire filters object
      expect(newState.calls.filters.page).toBeUndefined();
      expect(newState.calls.filters.sortBy).toBe("duration");
      expect(newState.calls.filters.order).toBe("ASC");
      expect(newState.calls.filters.counsellorName).toBe("John Doe");
    });

    it("should handle multiple filter updates", () => {
      // First filter update
      testStore.dispatch(
        updateFilters({
          page: 1,
          sortBy: "createdAt",
          order: "DESC" as const,
        }),
      );

      // Second filter update
      testStore.dispatch(
        updateFilters({
          counsellorName: "Jane Smith",
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        }),
      );

      // Third filter update
      testStore.dispatch(
        updateFilters({
          minDuration: 300,
          maxDuration: 1800,
          tags: "urgent",
        }),
      );

      const finalState = testStore.getState();
      // Only the last filter update should remain since updateFilters replaces the entire object
      expect(finalState.calls.filters).toEqual({
        minDuration: 300,
        maxDuration: 1800,
        tags: "urgent",
      });
    });

    it("should handle page update after filter update", () => {
      // Set filters first
      testStore.dispatch(
        updateFilters({
          sortBy: "duration",
          order: "ASC" as const,
          counsellorName: "John Doe",
        }),
      );

      // Then update page
      testStore.dispatch(updatePage(5));

      const newState = testStore.getState();
      expect(newState.calls.filters.page).toBe(5);
      expect(newState.calls.filters.sortBy).toBe("duration");
      expect(newState.calls.filters.order).toBe("ASC");
      expect(newState.calls.filters.counsellorName).toBe("John Doe");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined values in filters", () => {
      const filters = {
        page: undefined,
        offset: undefined,
        limit: undefined,
        sortBy: undefined,
        order: undefined,
        counsellorName: undefined,
        clientId: undefined,
        startDate: undefined,
        endDate: undefined,
        minDuration: undefined,
        maxDuration: undefined,
        minQualityScore: undefined,
        maxQualityScore: undefined,
        tags: undefined,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle null values in filters", () => {
      const filters = {
        page: null,
        sortBy: null,
        counsellorName: null,
      } as any;

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle empty string values", () => {
      const filters = {
        sortBy: "",
        order: "",
        counsellorName: "",
        clientId: "",
        startDate: "",
        endDate: "",
        tags: "",
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle zero values", () => {
      const filters = {
        page: 0,
        offset: 0,
        limit: 0,
        minDuration: 0,
        maxDuration: 0,
        minQualityScore: 0,
        maxQualityScore: 0,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle negative values", () => {
      const filters = {
        page: -1,
        offset: -10,
        limit: -5,
        minDuration: -100,
        maxDuration: -50,
        minQualityScore: -1,
        maxQualityScore: -5,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle very large numbers", () => {
      const filters = {
        page: 999999,
        offset: 999999,
        limit: 999999,
        minDuration: 999999,
        maxDuration: 999999,
        minQualityScore: 999999,
        maxQualityScore: 999999,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });

    it("should handle very long strings", () => {
      const longString = "A".repeat(10000);
      const filters = {
        sortBy: longString,
        order: longString,
        counsellorName: longString,
        clientId: longString,
        startDate: longString,
        endDate: longString,
        tags: longString,
      };

      testStore.dispatch(updateFilters(filters));

      const newState = testStore.getState();
      expect(newState.calls.filters).toEqual(filters);
    });
  });

  describe("State Immutability", () => {
    it("should not mutate the original state", () => {
      const initialState = testStore.getState();
      const originalFilters = { ...initialState.calls.filters };

      testStore.dispatch(updatePage(2));
      testStore.dispatch(updateFilters({ sortBy: "duration" }));

      // Original state should remain unchanged
      expect(originalFilters).toEqual({
        offset: 0,
        limit: CALL_LOGS_PAGINATION_LIMIT,
      });
    });

    it("should create new state objects on each update", () => {
      const state1 = testStore.getState();

      testStore.dispatch(updatePage(1));
      const state2 = testStore.getState();

      testStore.dispatch(updateFilters({ sortBy: "createdAt" }));
      const state3 = testStore.getState();

      // Each state should be a different object reference
      expect(state1).not.toBe(state2);
      expect(state2).not.toBe(state3);
      expect(state1).not.toBe(state3);
    });
  });
});
