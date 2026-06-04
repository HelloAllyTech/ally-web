import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { LanguageTabPanel } from "../LanguageTabPanel";

const tabs = [
  { id: "1", label: "English" },
  { id: "2", label: "Hindi" },
  { id: "3", label: "Tamil" },
];

describe("LanguageTabPanel", () => {
  it("renders all tabs", () => {
    render(
      <LanguageTabPanel tabs={tabs} activeTabId="1" onTabChange={vi.fn()}>
        <div>content</div>
      </LanguageTabPanel>,
    );
    expect(screen.getByRole("tab", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Hindi" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tamil" })).toBeInTheDocument();
  });

  it("marks the active tab with aria-selected", () => {
    render(
      <LanguageTabPanel tabs={tabs} activeTabId="2" onTabChange={vi.fn()}>
        <div>content</div>
      </LanguageTabPanel>,
    );
    expect(screen.getByRole("tab", { name: "Hindi" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "English" })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onTabChange with the correct id when a tab is clicked", () => {
    const onTabChange = vi.fn();
    render(
      <LanguageTabPanel tabs={tabs} activeTabId="1" onTabChange={onTabChange}>
        <div>content</div>
      </LanguageTabPanel>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Tamil" }));
    expect(onTabChange).toHaveBeenCalledWith("3");
  });

  it("renders children", () => {
    render(
      <LanguageTabPanel tabs={tabs} activeTabId="1" onTabChange={vi.fn()}>
        <div data-testid="panel-content">hello</div>
      </LanguageTabPanel>,
    );
    expect(screen.getByTestId("panel-content")).toBeInTheDocument();
  });

  it("hides the tab bar when there is only one tab", () => {
    render(
      <LanguageTabPanel tabs={[{ id: "1", label: "English" }]} activeTabId="1" onTabChange={vi.fn()}>
        <div>content</div>
      </LanguageTabPanel>,
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("applies active styles to the selected tab", () => {
    render(
      <LanguageTabPanel tabs={tabs} activeTabId="1" onTabChange={vi.fn()}>
        <div>content</div>
      </LanguageTabPanel>,
    );
    const activeTab = screen.getByRole("tab", { name: "English" });
    expect(activeTab.className).toContain("text-primary-500");
    expect(activeTab.className).toContain("border-b-2");
  });

  it("applies inactive styles to non-selected tabs", () => {
    render(
      <LanguageTabPanel tabs={tabs} activeTabId="1" onTabChange={vi.fn()}>
        <div>content</div>
      </LanguageTabPanel>,
    );
    const inactiveTab = screen.getByRole("tab", { name: "Hindi" });
    expect(inactiveTab.className).toContain("text-typography-600");
  });
});
