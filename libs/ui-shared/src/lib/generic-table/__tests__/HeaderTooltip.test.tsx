import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import "@testing-library/jest-dom";

import GenericTable from "../GenericTable";

const data = [{ name: "Alice", score: 4 }];

describe("column tooltips", () => {
  it("renders an explainer only for columns that declare one", () => {
    render(
      <GenericTable
        columns={
          [
            { key: "name", header: "Name" },
            { key: "score", header: "Points / min", tooltip: "Score per minute of practice." },
          ] as any
        }
        data={data}
        showSelectedFilters={false}
      />,
    );

    // One icon, on the one column that asked for it.
    expect(screen.getAllByTestId("header-tooltip")).toHaveLength(1);
  });

  it("exposes the explanation as the accessible name rather than the icon", () => {
    render(
      <GenericTable
        columns={[{ key: "score", header: "Points / min", tooltip: "Score per minute." }] as any}
        data={data}
        showSelectedFilters={false}
      />,
    );

    expect(screen.getByLabelText("Score per minute.")).toBeInTheDocument();
  });

  it("shows the bubble on hover and removes it on leave", () => {
    render(
      <GenericTable
        columns={[{ key: "score", header: "Points / min", tooltip: "Score per minute." }] as any}
        data={data}
        showSelectedFilters={false}
      />,
    );

    const icon = screen.getByTestId("header-tooltip");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.mouseEnter(icon);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Score per minute.");

    fireEvent.mouseLeave(icon);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("is reachable by keyboard", () => {
    render(
      <GenericTable
        columns={[{ key: "score", header: "Points / min", tooltip: "Score per minute." }] as any}
        data={data}
        showSelectedFilters={false}
      />,
    );

    fireEvent.focus(screen.getByTestId("header-tooltip"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("does not open the column's sort/filter popover when the icon is clicked", () => {
    const onFilterChange = vi.fn();
    render(
      <GenericTable
        columns={
          [
            {
              key: "score",
              header: "Points / min",
              tooltip: "Score per minute.",
              sortable: true,
              filterable: true,
            },
          ] as any
        }
        data={data}
        onFilterChange={onFilterChange}
        showSelectedFilters={false}
      />,
    );

    // Carbon's Popover always renders its children and toggles an "open"
    // class, so the Sort/Filter labels are in the DOM either way — the open
    // state is what has to stay false.
    const openPopovers = () => document.querySelectorAll(".cds--popover--open").length;

    expect(openPopovers()).toBe(0);

    // The header cell's own onClick opens that popover; the icon is an
    // explainer, not a control, so it swallows the click.
    fireEvent.click(screen.getByTestId("header-tooltip"));
    expect(openPopovers()).toBe(0);

    // Sanity check that the popover does open from the header itself —
    // otherwise the assertion above would pass on a broken header.
    // The label text also appears inside the popover's own column list, so
    // target the th's clickable wrapper rather than the text.
    fireEvent.click(document.querySelector("thead th > div") as Element);
    expect(openPopovers()).toBeGreaterThan(0);
  });
});
