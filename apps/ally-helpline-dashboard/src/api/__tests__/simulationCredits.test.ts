import { describe, it, expect, vi } from "vitest";

/**
 * The backend exposes simulation credits at `GET /v1/simulation-credits` and
 * reads the target user from a `userId` *query param* (optional — it falls
 * back to the token's own user). A caller with SYSTEM_ACCESS has no implicit
 * user, so omitting it there returns 400. Appending the id as a path segment
 * instead (`/v1/simulation-credits/7`) hits no route at all, so these tests
 * pin the request shape rather than just "a userId appears somewhere".
 */

const { captured } = vi.hoisted(() => ({
  captured: {} as Record<string, { query: (arg: unknown) => unknown }>,
}));

vi.mock("../baseAPI", () => ({
  baseAPI: {
    injectEndpoints: ({
      endpoints,
    }: {
      endpoints: (builder: unknown) => Record<string, { query: (arg: unknown) => unknown }>;
    }) => {
      const builder = {
        query: (definition: unknown) => definition,
        mutation: (definition: unknown) => definition,
      };
      Object.assign(captured, endpoints(builder));
      return {};
    },
  },
}));

vi.mock("@constants", () => ({
  ApiEndpoints: {
    SIMULATION: {
      SIMULATION_CREDITS: "/v1/simulation-credits",
    },
  },
  HttpMethod: {
    GET: "GET",
  },
  TAG_TYPES: {
    SIMULATION_CREDITS: "SimulationCredits",
  },
}));

vi.mock("@types", () => ({
  SimulationCredits: {},
}));

import "../simulationCredits";

describe("getSimulationCredits", () => {
  it("sends the userId as a query param, not a path segment", () => {
    const request = captured.getSimulationCredits.query(7);

    expect(request).toMatchObject({
      url: "/v1/simulation-credits",
      method: "GET",
      params: { userId: 7 },
    });
  });

  it("omits params when no userId is available", () => {
    const request = captured.getSimulationCredits.query(undefined) as {
      params?: unknown;
    };

    expect(request.params).toBeUndefined();
  });
});
