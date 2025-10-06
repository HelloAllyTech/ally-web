import { ReactNode } from "react";

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import TabGroup from "../TabGroup";

export interface TabItem {
  label: string;
  value: string;
}

export interface TabGroupProps {
  value: string;
  onChange: (event: React.SyntheticEvent, newValue: any) => void;
  tabs: TabItem[];
  className?: string;
  children?: ReactNode;
}

describe("TabGroup", () => {
  const mockTabs: TabItem[] = [
    { label: "Overview", value: "overview" },
    { label: "Details", value: "details" },
    { label: "Settings", value: "settings" },
  ];

  const mockOnChange = vi.fn();

  it("renders all tabs with correct labels", () => {
    render(<TabGroup value="details" onChange={mockOnChange} tabs={mockTabs} />);

    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("applies the 'selected' state to the correct tab based on the value prop", () => {
    render(<TabGroup value="details" onChange={mockOnChange} tabs={mockTabs} />);

    const selectedTab = screen.getByRole("tab", { name: "Details" });
    const unselectedTab = screen.getByRole("tab", { name: "Overview" });

    expect(selectedTab).toHaveAttribute("aria-selected", "true");
    expect(unselectedTab).toHaveAttribute("aria-selected", "false");
  });

  it("calls onChange with the correct value when a tab is clicked", () => {
    render(<TabGroup value="overview" onChange={mockOnChange} tabs={mockTabs} />);

    const settingsTab = screen.getByRole("tab", { name: "Settings" });
    fireEvent.click(settingsTab);

    expect(mockOnChange).toHaveBeenCalledTimes(1);

    expect(mockOnChange).toHaveBeenCalledWith(expect.anything(), "settings");
  });

  it("renders children content (the content area below the tabs)", () => {
    render(
      <TabGroup value="overview" onChange={mockOnChange} tabs={mockTabs}>
        <div data-testid="children-content">Content for Overview Tab</div>
      </TabGroup>,
    );
    expect(screen.getByTestId("children-content")).toBeInTheDocument();
  });

  it("applies custom className to the Tabs container", () => {
    render(
      <TabGroup
        value="overview"
        onChange={mockOnChange}
        tabs={mockTabs}
        className="test-custom-class"
      />,
    );

    const tabsContainer = screen.getByRole("tablist").closest(".MuiTabs-root");
    expect(tabsContainer).toHaveClass("test-custom-class");
  });
});
