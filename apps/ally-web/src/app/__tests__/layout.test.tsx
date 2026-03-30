import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";

import RootLayout from "../layout";

describe("app/layout.tsx", () => {
  it("wraps children with html and body and applies classes", () => {
    const { container } = render(
      <RootLayout>
        <div data-testid="child">child</div>
      </RootLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    const html = container.querySelector("html");
    const body = container.querySelector("body");
    expect(html).toBeTruthy();
    expect(body).toBeTruthy();
    expect(body?.className).toContain("min-h-screen");
  });
});
