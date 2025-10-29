import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { ProfileCard } from "../ProfileCard";

vi.mock("@assets", () => ({
  Bolt: () => <svg data-testid="bolt-icon" />,
}));

vi.mock("@constants", () => ({
  en: {
    userManagement: { creditsUsage: "Credits usage" },
  },
}));

vi.mock("@utils", () => ({
  formatCapitalizedEnum: (v: any) => v,
}));

describe("ProfileCard", () => {
  const baseUser = {
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    username: "alice",
    externalId: "ext-1",
    status: "ACTIVE",
    role: "admin",
    metadata: {},
    organization: null,
    tenantId: "t1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roles: ["admin"],
    creditLimit: 10,
    consumedCredits: 5,
    secondsAllowedPerCredit: 60,
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders name and email", () => {
    render(<ProfileCard user={baseUser} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    // Credits section should not be present by default
    expect(screen.queryByText("Credits usage")).not.toBeInTheDocument();
  });

  it("renders credits section when showCredits is true", () => {
    render(<ProfileCard user={baseUser} showCredits />);

    expect(screen.getByText("Credits usage")).toBeInTheDocument();
    expect(screen.getByTestId("bolt-icon")).toBeInTheDocument();
    // Shows consumed/limit values
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/\/\s*10/)).toBeInTheDocument();
  });
});
