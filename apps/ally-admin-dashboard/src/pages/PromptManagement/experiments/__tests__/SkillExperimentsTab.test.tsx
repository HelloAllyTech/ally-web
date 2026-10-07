import React from "react";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockList = vi.fn();
vi.mock("@api", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useGetSkillExperimentsQuery: () => mockList(),
}));
vi.mock("@ally-ui-mono/ui-shared", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  InlineNotification: ({ title }: any) => <div role="alert">{title}</div>,
}));
vi.mock("../SkillExperimentDrawer", () => ({
  SkillExperimentDrawer: ({ promptId }: any) => <div>{`drawer for ${promptId}`}</div>,
}));

import { en } from "@constants";

import { SkillExperimentsTab } from "../SkillExperimentsTab";

const row = (promptId: string, name: string, experiment: any) => ({
  promptId,
  promptCode: `code_${promptId}`,
  name,
  description: "",
  runtime: "ally-be",
  outputDescription: `${name} output`,
  experiment,
});

const renderTab = (path = "/manage-prompts?tab=experiments") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SkillExperimentsTab />
    </MemoryRouter>,
  );

describe("SkillExperimentsTab", () => {
  beforeEach(() => mockList.mockReset());

  it("distinguishes a failed load from an empty list", () => {
    mockList.mockReturnValue({ isError: true, refetch: vi.fn() });
    renderTab();
    expect(screen.getByRole("alert")).toHaveTextContent(en.skillExperiments.loadError);
    expect(screen.queryByText(en.skillExperiments.empty)).not.toBeInTheDocument();
  });

  it("says when no skill is connected", () => {
    mockList.mockReturnValue({ data: [] });
    renderTab();
    expect(screen.getByText(en.skillExperiments.empty)).toBeInTheDocument();
  });

  it("puts skills waiting for review first and shows where each stands", () => {
    mockList.mockReturnValue({
      data: [
        row("p-1", "Quiz grader", null),
        row("p-2", "Debrief", {
          status: "paused",
          championLabel: "V3",
          championScore: 86.4,
          targetScore: 85,
          lastTickAt: null,
        }),
      ],
    });
    renderTab();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Debrief")).toBeInTheDocument();
    expect(within(rows[0]).getByText(en.skillExperiments.status.paused)).toBeInTheDocument();
    expect(within(rows[0]).getByText("V3 · 86.4")).toBeInTheDocument();
    expect(within(rows[1]).getByText(en.skillExperiments.status.off)).toBeInTheDocument();
  });

  it("opens a skill's experiment, and deep-links to one", () => {
    mockList.mockReturnValue({ data: [row("p-1", "Quiz grader", null)] });
    renderTab();
    fireEvent.click(screen.getByText("Quiz grader"));
    expect(screen.getByText("drawer for p-1")).toBeInTheDocument();
  });

  it("opens the drawer straight from the URL", () => {
    mockList.mockReturnValue({ data: [row("p-1", "Quiz grader", null)] });
    renderTab("/manage-prompts?tab=experiments&skill=p-1");
    expect(screen.getByText("drawer for p-1")).toBeInTheDocument();
  });
});
