import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BuilderPrdDocument, BuilderPrdReadiness } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// BugHunter tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

vi.mock("@icons", () => ({ Download: () => <svg />, Edit: () => <svg /> }));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("remark-gfm", () => ({ default: () => undefined }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  // Only the props a DOM button understands — Carbon's own (renderIcon,
  // tooltipPosition, kind) would otherwise warn on every render.
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Tag: ({ children }: any) => <span>{children}</span>,
  TextArea: ({ id, value, onChange, disabled }: any) => (
    <textarea id={id} value={value} onChange={onChange} disabled={disabled} />
  ),
  OverflowMenu: ({ children, iconDescription }: any) => (
    <div>
      <button type="button" aria-label={iconDescription}>
        {iconDescription}
      </button>
      {children}
    </div>
  ),
  OverflowMenuItem: ({ itemText, onClick }: any) => (
    <button type="button" onClick={onClick}>
      {itemText}
    </button>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
}));

vi.mock("../ReadinessRing", () => ({ ReadinessRing: () => <div data-testid="ring" /> }));

// eslint-disable-next-line import/first
import { PrdDocPanel } from "../PrdDocPanel";

const readiness: BuilderPrdReadiness = {
  score: 40,
  ready: false,
  sections: [],
  blockers: [],
};

/**
 * The PRD as the agent actually wrote it in production: `openQuestions` and
 * `acceptanceCriteria` holding `{ id, text }` rows instead of sentences. React
 * throws on an object child (error #31), which took the whole Builder session
 * page down — transcript included — behind the page-level error boundary.
 */
const malformedPrd = {
  title: { id: "t1", text: "Per-tenant toggles" },
  summary: "A per-tenant switch",
  problem: { id: "p1", text: "Tenants cannot opt out" },
  usersAndContext: "",
  goals: "",
  nonGoals: "",
  requirements: [
    {
      id: "R1",
      title: "Toggle",
      description: "A per-tenant switch",
      acceptanceCriteria: [{ id: "ac1", text: "Admins see the toggle" }],
    },
  ],
  assumptions: [{ id: "A1", text: "One org at a time", status: "unconfirmed" }],
  technicalPlan: {
    repos: [{ repo: { id: "be", name: "ally-be" }, changesMd: "New module" }],
    dataModelMd: "",
    apiMd: "",
  },
  testPlanMd: "",
  e2ePlanMd: "",
  openQuestions: [{ id: "q1", text: "Which tenant owns this?" }],
} as unknown as BuilderPrdDocument;

describe("PrdDocPanel with a malformed agent-written PRD", () => {
  it("renders the agent's words instead of throwing on an object child", () => {
    render(
      <PrdDocPanel
        prd={malformedPrd}
        readiness={readiness}
        versionNumber={3}
        editable
        onSaveSection={vi.fn()}
      />,
    );

    expect(screen.getByText("Which tenant owns this?")).toBeInTheDocument();
    expect(screen.getByText("Admins see the toggle")).toBeInTheDocument();
    expect(screen.getByText("Tenants cannot opt out")).toBeInTheDocument();
    expect(screen.getByText("ally-be")).toBeInTheDocument();
  });

  it("still renders a well-formed PRD unchanged", () => {
    render(
      <PrdDocPanel
        prd={
          {
            ...malformedPrd,
            problem: "Tenants cannot opt out",
            openQuestions: ["Which tenant owns this?"],
          } as unknown as BuilderPrdDocument
        }
        readiness={readiness}
        versionNumber={3}
        editable
        onSaveSection={vi.fn()}
      />,
    );

    expect(screen.getByText("Which tenant owns this?")).toBeInTheDocument();
  });
});
