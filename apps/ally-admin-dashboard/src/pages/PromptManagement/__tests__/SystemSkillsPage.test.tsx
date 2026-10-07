import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockPermissions: string[] = [];
vi.mock("@hooks", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUser: () => ({ permissions: mockPermissions }),
}));
vi.mock("@ally-ui-mono/ui-shared", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Tabs: ({ items, onChange }: any) => (
    <div role="tablist">
      {items.map((item: any) => (
        <button key={item.id} role="tab" onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("../PromptManagement", () => ({
  PromptManagement: ({ header }: any) => (
    <div>
      {header}
      <span>skill list</span>
    </div>
  ),
}));
vi.mock("../experiments/SkillExperimentsTab", () => ({
  SkillExperimentsTab: () => <span>experiments tab</span>,
}));

import { en, Permissions } from "@constants";

import { SystemSkillsPage } from "../SystemSkillsPage";

const renderPage = (path = "/manage-prompts") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SystemSkillsPage />
    </MemoryRouter>,
  );

describe("SystemSkillsPage", () => {
  beforeEach(() => {
    mockPermissions = [];
  });

  it("is just the skill list for an admin who can't see experiments", () => {
    renderPage("/manage-prompts?tab=experiments");
    expect(screen.getByText("skill list")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("offers the Auto-improve tab to an admin who can see experiments", () => {
    mockPermissions = [Permissions.VIEW_SKILL_EXPERIMENT];
    renderPage();
    expect(screen.getByText("skill list")).toBeInTheDocument();
    fireEvent.click(screen.getByText(en.skillExperiments.tabs.experiments));
    expect(screen.getByText("experiments tab")).toBeInTheDocument();
  });
});
