import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RoleplayRehearsal } from "@src/types/roleplayStudio";

import { RehearsalRunRow } from "../RehearsalRunRow";

vi.mock("@components", () => ({
  // The real @constants barrel (used unmocked) imports cellTypes from
  // @components; mirror its key-equals-value shape.
  cellTypes: new Proxy({}, { get: (_target, prop) => String(prop) }),
  StatusBadge: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
}));

vi.mock("@utils", () => ({
  formatDate: (date: string) => `formatted:${date}`,
}));

const baseRehearsal: RoleplayRehearsal = {
  id: "run-1",
  status: "COMPLETED",
  createdAt: "2026-07-01T10:00:00Z",
};

const callbacks = { onSelect: vi.fn(), onCancel: vi.fn() };

const renderRow = (rehearsal: RoleplayRehearsal) =>
  render(<RehearsalRunRow rehearsal={rehearsal} isSelected={false} {...callbacks} />);

describe("RehearsalRunRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unit summary", () => {
    it("joins config profiles and the test case count with a separator", () => {
      renderRow({
        ...baseRehearsal,
        config: {
          traineeProfiles: ["SKILLED", "POOR"],
          testCases: [
            { id: "a", title: "A" },
            { id: "b", title: "B" },
            { id: "c", title: "C" },
          ],
        },
      });

      expect(screen.getByText("Skilled, Poor · 3 test cases")).toBeInTheDocument();
    });

    it("omits the profiles part for a test-case-only run", () => {
      renderRow({
        ...baseRehearsal,
        config: { traineeProfiles: [], testCases: [{ id: "a", title: "A" }] },
      });

      expect(screen.getByText("1 test case")).toBeInTheDocument();
    });

    it("falls back to the legacy top-level traineeProfiles when config is absent", () => {
      renderRow({ ...baseRehearsal, traineeProfiles: ["ADVERSARIAL"] });

      expect(screen.getByText("Adversarial")).toBeInTheDocument();
    });
  });

  describe("pass summary", () => {
    const withResults = (verdicts: string[]): RoleplayRehearsal => ({
      ...baseRehearsal,
      config: {
        traineeProfiles: ["SKILLED"],
        testCases: verdicts.map((_, i) => ({ id: `c${i}`, title: `C${i}` })),
      },
      results: {
        overall: 80,
        dimensions: {} as any,
        test_case_results: verdicts.map((verdict, i) => ({
          test_case_id: `c${i}`,
          verdict: verdict as any,
        })),
      },
    });

    it("shows a green summary when every case passed", () => {
      renderRow(withResults(["PASSED", "PASSED"]));

      const summary = screen.getByText("2/2 passed");
      expect(summary).toHaveClass("text-success-500");
    });

    it("shows a red summary when any case failed", () => {
      renderRow(withResults(["PASSED", "FAILED"]));

      const summary = screen.getByText("1/2 passed");
      expect(summary).toHaveClass("text-destructive-500");
    });

    it("shows a neutral summary for inconclusive-but-not-failed runs", () => {
      renderRow(withResults(["PASSED", "INCONCLUSIVE"]));

      const summary = screen.getByText("1/2 passed");
      expect(summary).toHaveClass("text-typography-600");
    });

    it("hides the summary while the run is not completed", () => {
      renderRow({ ...withResults(["PASSED"]), status: "RUNNING" });

      expect(screen.queryByText("1/1 passed")).not.toBeInTheDocument();
    });

    it("hides the summary for runs without test cases", () => {
      renderRow({
        ...baseRehearsal,
        config: { traineeProfiles: ["SKILLED"] },
        results: { overall: 90, dimensions: {} as any },
      });

      expect(screen.queryByText(/passed/)).not.toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("selects the run on click", () => {
      renderRow({ ...baseRehearsal, config: { traineeProfiles: ["SKILLED"] } });

      fireEvent.click(screen.getByTestId("rehearsal-run-run-1"));

      expect(callbacks.onSelect).toHaveBeenCalledTimes(1);
    });
  });
});
