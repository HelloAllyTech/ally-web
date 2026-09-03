import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
/**
 * The sibling BuilderPipeline.test.tsx mocks `@ally-ui-mono/ui-shared` wholesale,
 * which makes its assertions fast and precise but means it would still pass if
 * the page crashed inside a real Carbon Table or Dropdown. This one renders the
 * page with the real components and stubs only the network, so a mount-time
 * failure in the design system is caught here rather than in the browser.
 */
vi.mock("@utils", () => ({}));
vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@api", () => ({
  useGetBuilderPipelineHealthQuery: () => ({
    data: {
      windowDays: 30,
      phases: [
        {
          phase: "code-1",
          model: "claude-sonnet-5",
          invocations: 2,
          totalCostUsd: 8.92,
          medianCostUsd: 4.46,
          medianWallMs: 2008802,
          p95WallMs: 2008802,
          medianApiMs: 775569,
          medianTurns: 148,
        },
        {
          phase: "plan",
          model: "claude-opus-5",
          invocations: 1,
          totalCostUsd: 2,
          medianCostUsd: 2,
          medianWallMs: null,
          p95WallMs: null,
          medianApiMs: null,
          medianTurns: null,
        },
      ],
      gates: [{ repo: "ally-be", kind: "test", results: 2, passed: 1, passRate: 0.5 }],
      outcomes: [{ status: "SUCCEEDED", mode: "build", runs: 1, medianRunnerMinutes: 18 }],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

/* eslint-disable import/first, import/order -- these must follow the vi.mock
   calls above, which vitest hoists to the top of the file. */
import { MemoryRouter } from "react-router-dom";

import { BuilderPipeline } from "../BuilderPipeline";

describe("BuilderPipeline with real Carbon", () => {
  it("mounts and renders its tables", () => {
    render(
      <MemoryRouter>
        <BuilderPipeline />
      </MemoryRouter>,
    );
    expect(screen.getByText("Where the time goes")).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(4);
    expect(screen.getAllByText("33m 29s").length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("39% waiting on the model, 61% running its tools"),
    ).toBeInTheDocument();
    expect(screen.getByText("SUCCEEDED")).toBeInTheDocument();
  });
});
