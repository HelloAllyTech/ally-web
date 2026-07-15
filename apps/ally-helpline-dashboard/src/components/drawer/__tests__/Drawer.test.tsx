import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import Drawer from "../Drawer";

describe("Drawer", () => {
  it("renders as a dialog with title and children when open", () => {
    render(
      <Drawer
        open
        drawerClassName="custom-class"
        onClose={vi.fn()}
        title="My Title"
        headerButtons={[]}
      >
        <div data-testid="content">Child</div>
      </Drawer>,
    );

    // SidePanel renders an aside with role="dialog"
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
    // drawerClassName controls the panel width, so it is applied to the panel
    // <aside> (role="dialog"), not an inner wrapper.
    expect(screen.getByRole("dialog")).toHaveClass("custom-class");
  });

  it("does not render anything when closed", () => {
    render(
      <Drawer open={false} onClose={vi.fn()} title="Hidden" headerButtons={[]}>
        <div data-testid="content">Child</div>
      </Drawer>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("clicking the SidePanel close button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="" headerButtons={[]}>
        test
      </Drawer>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("filters header buttons by show and triggers onClick", () => {
    const onShown = vi.fn();
    const onHidden = vi.fn();

    render(
      <Drawer
        open
        onClose={vi.fn()}
        title=""
        headerButtons={[
          {
            show: true,
            alt: "a",
            text: "Shown",
            onClick: onShown,
            icon: <span data-testid="ic" />,
          },
          { show: false, alt: "b", text: "Hidden", onClick: onHidden, icon: <span /> },
        ]}
      >
        test
      </Drawer>,
    );

    // only shown button - use testid since button doesn't have accessible text
    const shown = screen.getByTestId("drawer-header-button-a");
    expect(shown).toBeInTheDocument();
    expect(screen.queryByTestId("drawer-header-button-b")).toBeNull();

    fireEvent.click(shown);
    expect(onShown).toHaveBeenCalled();
    expect(onHidden).not.toHaveBeenCalled();
  });

  it("pressing Escape triggers onClose", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="X" headerButtons={[]}>
        test
      </Drawer>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
