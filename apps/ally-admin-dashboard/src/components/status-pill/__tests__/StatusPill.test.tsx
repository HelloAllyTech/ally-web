import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { SimulationStatus } from "@types";

import { StatusPill } from "../StatusPill";

// Pull the real color/label helpers from their module directly instead of the
// "@utils" barrel, which drags in socket/store side effects the test doesn't need.
vi.mock("@utils", async () => {
  const common = await vi.importActual<typeof import("@utils/common")>("@utils/common");
  return {
    getStatusColor: common.getStatusColor,
    formatCapitalizedEnum: common.formatCapitalizedEnum,
  };
});

const renderComponent = (props: Partial<React.ComponentProps<typeof StatusPill>> = {}) => {
  return render(<StatusPill status={SimulationStatus.ACTIVE} {...props} />);
};

describe("StatusPill", () => {
  it("renders ACTIVE as 'Published' with the success color classes", () => {
    renderComponent({ status: SimulationStatus.ACTIVE });

    const pill = screen.getByText("Published");
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveClass("bg-success-100", "text-success-900");
  });

  it("renders PUBLISHED as 'Published' with the default color classes", () => {
    renderComponent({ status: SimulationStatus.PUBLISHED });

    const pill = screen.getByText("Published");
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveClass("bg-neutral-100", "text-typography-800");
  });

  it("renders DRAFT as 'Draft' with the neutral color classes", () => {
    renderComponent({ status: SimulationStatus.DRAFT });

    const pill = screen.getByText("Draft");
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveClass("bg-neutral-200", "text-typography-800");
  });

  it("renders ARCHIVED as 'Archived' with the warning color classes", () => {
    renderComponent({ status: SimulationStatus.ARCHIVED });

    const pill = screen.getByText("Archived");
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveClass("bg-warning-100", "text-typography-800");
  });

  it("renders the -- fallback for an empty status", () => {
    renderComponent({ status: "" as SimulationStatus });

    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("appends a custom className to the pill", () => {
    renderComponent({ status: SimulationStatus.DRAFT, className: "custom-class" });

    expect(screen.getByText("Draft")).toHaveClass("custom-class");
  });
});
