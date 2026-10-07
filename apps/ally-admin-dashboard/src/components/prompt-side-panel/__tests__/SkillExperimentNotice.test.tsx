import React from "react";

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockPermissions: string[] = [];
const mockList = vi.fn();
vi.mock("@hooks", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUser: () => ({ permissions: mockPermissions }),
}));
vi.mock("@api", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useGetSkillExperimentsQuery: (_arg: unknown, options: { skip?: boolean }) =>
    options?.skip ? {} : mockList(),
}));

import { en, Permissions } from "@constants";

import { SkillExperimentNotice } from "../SkillExperimentNotice";

const renderNotice = (promptId = "p-1") =>
  render(
    <MemoryRouter>
      <SkillExperimentNotice promptId={promptId} />
    </MemoryRouter>,
  );

describe("SkillExperimentNotice", () => {
  beforeEach(() => {
    mockPermissions = [Permissions.VIEW_SKILL_EXPERIMENT];
    mockList.mockReset();
    mockList.mockReturnValue({
      data: [{ promptId: "p-1", experiment: { status: "testing" } }],
    });
  });

  it("warns that editing restarts a running experiment, and links to it", () => {
    renderNotice();
    expect(screen.getByText(en.skillExperiments.sidePanel.editWarning)).toBeInTheDocument();
    expect(screen.getByText(en.skillExperiments.sidePanel.open)).toHaveAttribute(
      "href",
      "/manage-prompts?tab=experiments&skill=p-1",
    );
  });

  it("stays out of the way when the experiment is off", () => {
    mockList.mockReturnValue({ data: [{ promptId: "p-1", experiment: { status: "off" } }] });
    const { container } = renderNotice();
    expect(container).toBeEmptyDOMElement();
  });

  it("never asks for experiments without permission", () => {
    mockPermissions = [];
    const { container } = renderNotice();
    expect(mockList).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});
