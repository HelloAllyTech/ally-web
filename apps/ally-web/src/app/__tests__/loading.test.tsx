import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";

import Loading from "../loading";

describe("app/loading.tsx", () => {
  it("renders loading indicator text and structure", () => {
    const { container } = render(<Loading />);
    expect(screen.getByText("Loading resources...")).toBeInTheDocument();
    // basic structural assertion
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
