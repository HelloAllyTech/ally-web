import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) =>
    React.createElement("a", { href, ...props }, children),
}));

import NotFound from "../not-found";

describe("app/not-found.tsx", () => {
  it("renders the 404 message with a link back to search", () => {
    render(<NotFound />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Back to search" });
    expect(link).toHaveAttribute("href", "/");
  });
});
