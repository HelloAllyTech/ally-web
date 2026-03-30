import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";

import ResourceCard from "../ResourceCard";

describe("ResourceCard", () => {
  const baseProps = {
    title: "Test Title",
    description: "Line 1\nLine 2\nLine 3",
    category: "guidelines",
    tags: ["tag1", "tag2"],
    isExpanded: false,
    setExpandedCard: vi.fn(),
  };

  it("renders title, description and badges", () => {
    render(<ResourceCard {...baseProps} />);
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("guidelines")).toBeInTheDocument();
    expect(screen.getByText("tag1")).toBeInTheDocument();
    expect(screen.getByText("tag2")).toBeInTheDocument();
  });

  it("toggles expand when clicking the card", () => {
    const setExpandedCard = vi.fn();
    render(<ResourceCard {...baseProps} setExpandedCard={setExpandedCard} />);
    fireEvent.click(screen.getByText("Test Title"));
    expect(setExpandedCard).toHaveBeenCalledWith(true);
  });
});
