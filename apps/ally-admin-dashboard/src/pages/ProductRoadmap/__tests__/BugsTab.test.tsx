import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// The real one is large and complex, and the point of this test is only to
// assert that BugsTab renders it with the right props — so it is mocked.
import { BugFindingsTable } from "../../BugHunter/BugFindingsTable";
import { BugsTab } from "../BugsTab";

vi.mock("../../BugHunter/BugFindingsTable", () => ({
  BugFindingsTable: vi.fn(() => <div data-testid="bug-findings-table" />),
}));

const mount = () =>
  render(
    <MemoryRouter initialEntries={["/product-roadmap?tab=bugs"]}>
      <BugsTab />
    </MemoryRouter>,
  );

describe("ProductRoadmap — Bugs tab", () => {
  it("renders the bug findings table without a limit", () => {
    mount();

    expect(screen.getByTestId("bug-findings-table")).toBeInTheDocument();
    expect(BugFindingsTable).toHaveBeenCalledWith(
      expect.objectContaining({
        initialLimit: undefined,
      }),
      {},
    );
  });
});