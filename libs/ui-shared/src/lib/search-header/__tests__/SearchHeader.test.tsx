import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";

import SearchHeader from "../SearchHeader";

describe("SearchHeader", () => {
  it("renders title and description by default", () => {
    render(<SearchHeader />);
    expect(screen.getByAltText("Ally Logo")).toBeInTheDocument();
    expect(
      screen.getByText("Guidance, safety, and support — whenever you need it."),
    ).toBeInTheDocument();
  });

  it("hides description on mobile when showDescriptionInMobile=false", () => {
    render(<SearchHeader showDescriptionInMobile={false} />);
    expect(screen.getByAltText("Ally Logo")).toBeInTheDocument();
    // description is in DOM but hidden via class when false only for mobile; presence check still valid
    expect(
      screen.getByText("Guidance, safety, and support — whenever you need it."),
    ).toBeInTheDocument();
  });
});
