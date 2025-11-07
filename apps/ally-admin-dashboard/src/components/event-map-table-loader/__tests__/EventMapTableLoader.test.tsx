import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { EventMapTableLoader } from "../EventMapTableLoader";

describe("EventMapTableLoader", () => {
  it("renders container with pulse animation", () => {
    const { container } = render(<EventMapTableLoader />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("renders 7 header skeleton cells", () => {
    const { container } = render(<EventMapTableLoader />);
    const header = container.querySelector(".flex.gap-4.px-4.py-3.border-b");
    const cells = header?.querySelectorAll(".rounded");
    expect(cells?.length).toBe(7);
  });

  it("renders 5 rows each with 7 skeleton cells", () => {
    const { container } = render(<EventMapTableLoader />);
    const rows = container.querySelectorAll(".flex.gap-4.px-4.py-4.border-b");
    expect(rows.length).toBe(5);
    rows.forEach(row => {
      expect(row.querySelectorAll(".rounded").length).toBe(7);
    });
  });
});
