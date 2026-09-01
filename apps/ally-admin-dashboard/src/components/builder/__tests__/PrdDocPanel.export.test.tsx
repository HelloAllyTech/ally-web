import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BuilderPrdDocument, BuilderPrdReadiness } from "@types";

vi.mock("@components", () => ({ cellTypes: {} }));
vi.mock("@icons", () => ({ Download: () => <svg />, Edit: () => <svg /> }));
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("remark-gfm", () => ({ default: () => undefined }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("@ally-ui-mono/ui-shared", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
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
  Tag: ({ children }: any) => <span>{children}</span>,
  TextArea: ({ id, value, onChange, disabled }: any) => (
    <textarea id={id} value={value} onChange={onChange} disabled={disabled} />
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
}));

vi.mock("../ReadinessRing", () => ({ ReadinessRing: () => <div data-testid="ring" /> }));

const downloadPrdMarkdown = vi.fn();
const downloadPrdPdf = vi.fn();
vi.mock("../prdExport", () => ({
  downloadPrdMarkdown: (...args: unknown[]) => downloadPrdMarkdown(...args),
  downloadPrdPdf: (...args: unknown[]) => downloadPrdPdf(...args),
}));

// eslint-disable-next-line import/first
import { toast } from "sonner";
// eslint-disable-next-line import/first
import { PrdDocPanel } from "../PrdDocPanel";

const readiness: BuilderPrdReadiness = { score: 40, ready: false, sections: [], blockers: [] };

const prd = {
  title: "Per-tenant toggles",
  summary: "A per-tenant switch",
  problem: "",
  usersAndContext: "",
  goals: "",
  nonGoals: "",
  requirements: [],
  assumptions: [],
  technicalPlan: { repos: [], dataModelMd: "", apiMd: "" },
  testPlanMd: "",
  e2ePlanMd: "",
  openQuestions: [],
} as unknown as BuilderPrdDocument;

const renderPanel = (editable = true) =>
  render(
    <PrdDocPanel
      prd={prd}
      readiness={readiness}
      versionNumber={4}
      editable={editable}
      onSaveSection={vi.fn()}
      sessionTitle="Per-tenant toggles"
      repos={["ally-be"]}
    />,
  );

describe("PrdDocPanel export", () => {
  it("downloads a PDF, carrying the session's repos and version into the file", () => {
    downloadPrdPdf.mockClear();
    renderPanel();

    fireEvent.click(screen.getByText("Download as PDF"));

    expect(downloadPrdPdf).toHaveBeenCalledWith(prd, {
      sessionTitle: "Per-tenant toggles",
      repos: ["ally-be"],
      versionNumber: 4,
    });
  });

  it("downloads Markdown", () => {
    downloadPrdMarkdown.mockClear();
    renderPanel();

    fireEvent.click(screen.getByText("Download as Markdown (.md)"));

    expect(downloadPrdMarkdown).toHaveBeenCalledTimes(1);
  });

  /**
   * Export reads the document; it does not write it. Locking it alongside
   * editing would take the spec away exactly when a build is running off it —
   * which is when someone most wants to send it to a stakeholder.
   */
  it("stays available while the PRD is locked for a running build", () => {
    downloadPrdPdf.mockClear();
    renderPanel(false);

    fireEvent.click(screen.getByText("Download as PDF"));

    expect(downloadPrdPdf).toHaveBeenCalledTimes(1);
  });

  it("toasts instead of throwing when the exporter chokes on the document", () => {
    downloadPrdPdf.mockImplementationOnce(() => {
      throw new Error("bad shape");
    });
    renderPanel();

    expect(() => fireEvent.click(screen.getByText("Download as PDF"))).not.toThrow();
    expect(toast.error).toHaveBeenCalledWith("Couldn't build that file.");
  });
});
