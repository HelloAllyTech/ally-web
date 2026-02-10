import React from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import Drawer from "../Drawer";

vi.mock("@mui/material", () => ({
  Drawer: ({ anchor, open, onClose, className, children }: any) => (
    <div
      data-testid="mui-drawer"
      data-anchor={anchor}
      data-open={open ? "true" : "false"}
      className={className}
    >
      <button data-testid="mock-onclose" onClick={onClose} />
      {children}
    </div>
  ),
  Tooltip: ({ children, title }: any) => (
    <div data-testid="tooltip" title={title}>
      {children}
    </div>
  ),
}));

vi.mock("lucide-react", () => ({
  ChevronsRight: (props: any) => <button data-testid="chevrons" {...props} />,
}));

describe("Drawer", () => {
  it("passes props to MUI Drawer and renders children", () => {
    render(
      <Drawer open className="custom-class" onClose={vi.fn()} title="My Title" headerButtons={[]}>
        <div data-testid="content">Child</div>
      </Drawer>,
    );

    const mui = screen.getByTestId("mui-drawer");
    expect(mui).toHaveAttribute("data-anchor", "right");
    expect(mui).toHaveAttribute("data-open", "true");
    expect(mui).toHaveClass("custom-class");
    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });

  it("clicking chevrons calls onClose", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="" headerButtons={[]}>
        test
      </Drawer>,
    );

    fireEvent.click(screen.getByTestId("drawer-close-button"));
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

  it("mock onClose button inside MUI wrapper triggers onClose too", () => {
    const onClose = vi.fn();
    render(
      <Drawer open onClose={onClose} title="X" headerButtons={[]}>
        test
      </Drawer>,
    );
    fireEvent.click(screen.getByTestId("mock-onclose"));
    expect(onClose).toHaveBeenCalled();
  });
});
