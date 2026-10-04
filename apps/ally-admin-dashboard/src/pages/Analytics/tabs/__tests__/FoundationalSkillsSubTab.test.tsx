import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Carbon charts draw through d3, which captures requestAnimationFrame at
// import time — hoisted stub, same reason the sibling chart tests need one.
vi.hoisted(() => {
  if (typeof window !== "undefined") {
    window.requestAnimationFrame = (() => 0) as typeof window.requestAnimationFrame;
  }
});

const progressMock = vi.fn();
const benchmarkMock = vi.fn();
const behavioursMock = vi.fn();
const tenantsMock = vi.fn();

const idleQuery = () => ({
  data: undefined,
  isLoading: false,
  isFetching: false,
  isUninitialized: false,
  isError: false,
  error: undefined,
  refetch: vi.fn(),
});

// Full replacement, not a partial spread: the tab's three measure queries are
// spies that answer idle (every card then renders its empty state), and the
// org list is the one response these tests are about.
vi.mock("@api", () => ({
  useGetFoundationalSkillsProgressQuery: (args: unknown) => progressMock(args),
  useGetFoundationalSkillsBenchmarkQuery: (args: unknown) => benchmarkMock(args),
  useGetFoundationalSkillsBehavioursQuery: (args: unknown) => behavioursMock(args),
  useGetFoundationalSkillsLearnerQuery: () => idleQuery(),
  useGetTenantsQuery: (args: unknown) => tenantsMock(args),
}));

import { FoundationalSkillsSubTab } from "../FoundationalSkillsSubTab";

const tenants = [
  { id: "t-zeta", name: "Zeta Health", isTestOrganization: false, deletedAt: null },
  { id: "t-qa", name: "QA sandbox", isTestOrganization: true, deletedAt: null },
  { id: "t-alpha", name: "Alpha Care", isTestOrganization: false, deletedAt: null },
];

/**
 * The args of a spy's most recent call from the tab itself. The per-person
 * panel shares the habits hook (`{ userId }`) and is deliberately not narrowed
 * by org, so its calls are skipped.
 */
const lastArgs = (mock: ReturnType<typeof vi.fn>) =>
  mock.mock.calls
    .map(([args]) => args)
    .filter(args => !(args && typeof args === "object" && "userId" in args))
    .at(-1);

describe("FoundationalSkillsSubTab — org filter", () => {
  beforeEach(() => {
    for (const mock of [progressMock, benchmarkMock, behavioursMock]) {
      mock.mockReset();
      mock.mockReturnValue(idleQuery());
    }
    tenantsMock.mockReset();
    tenantsMock.mockReturnValue({ ...idleQuery(), data: { data: tenants } });
  });

  it("opens on all orgs, with no tenant on any query", () => {
    render(<FoundationalSkillsSubTab />);

    expect(screen.getByRole("combobox", { name: "Org" })).toHaveTextContent("All orgs");
    expect(lastArgs(progressMock)).not.toHaveProperty("tenantId");
    expect(lastArgs(benchmarkMock)).not.toHaveProperty("tenantId");
    expect(lastArgs(behavioursMock)).not.toHaveProperty("tenantId");
  });

  it("lists live orgs by name and leaves test orgs out", async () => {
    render(<FoundationalSkillsSubTab />);

    await userEvent.click(screen.getByRole("combobox", { name: "Org" }));

    const options = screen.getAllByRole("option").map(o => o.textContent);
    expect(options).toEqual(["All orgs", "Alpha Care", "Zeta Health"]);
  });

  it("narrows every section to the picked org, and back again", async () => {
    render(<FoundationalSkillsSubTab />);

    await userEvent.click(screen.getByRole("combobox", { name: "Org" }));
    await userEvent.click(screen.getByRole("option", { name: "Alpha Care" }));

    expect(lastArgs(progressMock)).toMatchObject({ tenantId: "t-alpha", cuts: undefined });
    expect(lastArgs(benchmarkMock)).toEqual({ tenantId: "t-alpha" });
    expect(lastArgs(behavioursMock)).toEqual({ tenantId: "t-alpha" });

    await userEvent.click(screen.getByRole("combobox", { name: "Org" }));
    await userEvent.click(screen.getByRole("option", { name: "All orgs" }));

    expect(lastArgs(progressMock)).not.toHaveProperty("tenantId");
    expect(lastArgs(benchmarkMock)).toEqual({});
  });

  it("still offers all orgs when the org list cannot be read", () => {
    tenantsMock.mockReturnValue({ ...idleQuery(), isError: true });
    render(<FoundationalSkillsSubTab />);

    expect(screen.getByRole("combobox", { name: "Org" })).toHaveTextContent("All orgs");
  });
});
