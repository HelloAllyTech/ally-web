import "@testing-library/jest-dom";

import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import ButtonGroup from "../ButtonGroup";

describe("ButtonGroup", () => {
  const makeButtons = (overrides = {}) => [
    { text: "First", show: true, action: vi.fn(), isActive: true, ...overrides },
    { text: "Second", show: true, action: vi.fn(), isActive: false },
  ];

  it("renders only buttons with show: true", () => {
    render(
      <ButtonGroup
        buttonList={[
          { text: "Visible", show: true, action: vi.fn() },
          { text: "Hidden", show: false, action: vi.fn() },
        ]}
      />,
    );

    expect(screen.getByText("Visible")).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("calls the action when a button is clicked", () => {
    const action = vi.fn();
    render(<ButtonGroup buttonList={[{ text: "Click", show: true, action }]} />);

    fireEvent.click(screen.getByText("Click"));
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("exposes aria-pressed reflecting the active state", () => {
    render(<ButtonGroup buttonList={makeButtons()} />);

    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent("First");
    expect(screen.getByRole("button", { pressed: false })).toHaveTextContent("Second");
  });

  it("disables and marks aria-disabled when isDisabled is set", () => {
    render(
      <ButtonGroup buttonList={[{ text: "Off", show: true, action: vi.fn(), isDisabled: true }]} />,
    );

    const button = screen.getByText("Off").closest("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveClass("disabled:opacity-50");
  });

  it("renders real submit-safe buttons (type=button)", () => {
    render(<ButtonGroup buttonList={makeButtons()} />);

    screen.getAllByRole("button").forEach(button => {
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
