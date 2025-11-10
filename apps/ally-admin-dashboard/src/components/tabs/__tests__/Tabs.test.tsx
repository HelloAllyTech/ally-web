import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";

import { Tabs } from "../Tabs";

describe("Tabs", () => {
  const mockItems = [
    { id: "tab1", label: "Tab 1", count: 5 },
    { id: "tab2", label: "Tab 2", count: 10 },
    { id: "tab3", label: "Tab 3", count: 0 },
  ];

  it("renders all tab items", () => {
    const onChange = vi.fn();
    render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    expect(screen.getByText(/Tab 1/)).toBeInTheDocument();
    expect(screen.getByText(/Tab 2/)).toBeInTheDocument();
    expect(screen.getByText(/Tab 3/)).toBeInTheDocument();
  });

  it("displays count for each tab", () => {
    const onChange = vi.fn();
    render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    expect(screen.getByText(/Tab 1 5/)).toBeInTheDocument();
    expect(screen.getByText(/Tab 2 10/)).toBeInTheDocument();
  });

  it("displays 0 when count is 0", () => {
    const onChange = vi.fn();
    render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    expect(screen.getByText(/Tab 3 0/)).toBeInTheDocument();
  });

  it("calls onChange when tab is clicked", () => {
    const onChange = vi.fn();
    render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const tab2 = screen.getByText(/Tab 2/);
    fireEvent.click(tab2);
    expect(onChange).toHaveBeenCalledWith("tab2");
  });

  it("renders active indicator for active tab", () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const indicators = container.querySelectorAll("[aria-hidden]");
    expect(indicators.length).toBe(1);
  });

  it("active indicator has correct styling", () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const indicator = container.querySelector("[aria-hidden]");
    expect(indicator?.className).toContain("h-[3px]");
  });

  it("applies custom className", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Tabs items={mockItems} activeId="tab1" onChange={onChange} className="custom-class" />,
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("has border bottom", () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("border-b");
  });

  it("renders with empty items array", () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs items={[]} activeId="" onChange={onChange} />);

    expect(container.querySelector("nav")).toBeInTheDocument();
  });

  it("handles tab change for different tabs", () => {
    const onChange = vi.fn();
    render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    fireEvent.click(screen.getByText(/Tab 1/));
    expect(onChange).toHaveBeenCalledWith("tab1");

    fireEvent.click(screen.getByText(/Tab 2/));
    expect(onChange).toHaveBeenCalledWith("tab2");

    fireEvent.click(screen.getByText(/Tab 3/));
    expect(onChange).toHaveBeenCalledWith("tab3");
  });

  it("has correct spacing between tabs", () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("space-x-8");
  });

  it("tabs have correct padding", () => {
    const onChange = vi.fn();
    render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const tab1 = screen.getByText(/Tab 1/);
    expect(tab1.className).toContain("py-3");
    expect(tab1.className).toContain("px-3");
  });

  it("tabs prevent text wrapping", () => {
    const onChange = vi.fn();
    render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const tab1 = screen.getByText(/Tab 1/);
    expect(tab1.className).toContain("whitespace-nowrap");
  });

  it("renders nav with correct aria-label", () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const nav = container.querySelector("nav");
    expect(nav).toHaveAttribute("aria-label", "Tabs");
  });

  it("indicator is positioned at bottom", () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const indicator = container.querySelector("[aria-hidden]");
    expect(indicator?.className).toContain("bottom-[0px]");
  });

  it("indicator is centered horizontally", () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs items={mockItems} activeId="tab1" onChange={onChange} />);

    const indicator = container.querySelector("[aria-hidden]");
    expect(indicator?.className).toContain("left-1/2");
    expect(indicator?.className).toContain("-translate-x-1/2");
  });

  it("handles undefined count gracefully", () => {
    const onChange = vi.fn();
    const itemsWithoutCount = [{ id: "tab1", label: "Tab 1" }];
    render(<Tabs items={itemsWithoutCount} activeId="tab1" onChange={onChange} />);

    // When count is undefined, only the label should be displayed without any count
    expect(screen.getByText("Tab 1")).toBeInTheDocument();
    // Verify that no count is appended (the text should be exactly "Tab 1" with possible whitespace)
    const tabButton = screen.getByText("Tab 1");
    expect(tabButton.textContent?.trim()).toBe("Tab 1");
  });
});
