import { describe, expect, it, vi } from "vitest";

import type { BuilderPrdDocument } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// other builder tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

// jsPDF is a canvas-adjacent dependency and this suite is about *what* is
// written, not how it is typeset — so the document is a recorder. The one
// thing worth asserting through it is that a section reaches the PDF at all.
const pdfCalls: { text: string[]; saved: string[] } = { text: [], saved: [] };
vi.mock("jspdf", () => ({
  default: class {
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setPage() {}
    addPage() {}
    getNumberOfPages() {
      return 1;
    }
    splitTextToSize(text: string) {
      return String(text).split("\n");
    }
    text(line: string) {
      pdfCalls.text.push(line);
    }
    save(filename: string) {
      pdfCalls.saved.push(filename);
    }
  },
}));

// eslint-disable-next-line import/first
import { downloadPrdPdf, prdExportFilename, prdToMarkdown, type PrdExportMeta } from "../prdExport";

const meta: PrdExportMeta = {
  sessionTitle: "Session fallback title",
  repos: ["ally-be", "ally-web"],
  versionNumber: 4,
  now: new Date("2026-09-01T10:00:00Z"),
};

const prd = {
  title: "Per-tenant toggles",
  summary: "A per-tenant switch for the helpline banner.",
  problem: "Tenants cannot opt out.",
  usersAndContext: "Helpline admins.",
  goals: "Let an admin turn the banner off.",
  nonGoals: "",
  requirements: [
    {
      id: "R1",
      title: "Toggle",
      description: "A per-tenant switch",
      acceptanceCriteria: ["Admins see the toggle", "The setting survives a reload"],
    },
  ],
  assumptions: [{ id: "A1", text: "One org at a time", status: "unconfirmed" }],
  technicalPlan: {
    repos: [{ repo: "ally-be", changesMd: "New `tenant_settings` column." }],
    dataModelMd: "One boolean column.",
    apiMd: "",
  },
  testPlanMd: "Unit tests on the guard.",
  e2ePlanMd: "",
  openQuestions: ["Which tenant owns this?"],
} as unknown as BuilderPrdDocument;

describe("prdToMarkdown", () => {
  const markdown = prdToMarkdown(prd, meta);

  it("leads with the PRD title and a provenance line", () => {
    expect(markdown.startsWith("# Per-tenant toggles\n")).toBe(true);
    expect(markdown).toContain("PRD v4 · ally-be, ally-web · exported");
  });

  it("carries every section of the document, not just the prose ones", () => {
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("## Requirements");
    expect(markdown).toContain("### R1 — Toggle");
    expect(markdown).toContain("- Admins see the toggle");
    expect(markdown).toContain("## Technical plan");
    expect(markdown).toContain("### ally-be");
    expect(markdown).toContain("New `tenant_settings` column.");
    expect(markdown).toContain("## Open questions");
    expect(markdown).toContain("- Which tenant owns this?");
  });

  it("keeps an assumption's confirmed/unconfirmed status, which the tag carries on screen", () => {
    expect(markdown).toContain("- [Unconfirmed] One org at a time");
  });

  it("names an empty section rather than dropping it, so the gap is visible", () => {
    expect(markdown).toContain("## Non-goals\n\n_Nothing here yet._");
  });

  it("does not blank-line-separate consecutive bullets into loose lists", () => {
    expect(markdown).toContain("- Admins see the toggle\n- The setting survives a reload");
  });

  it("survives an agent-written PRD holding objects where strings belong", () => {
    const malformed = {
      ...prd,
      title: { id: "t1", text: "Per-tenant toggles" },
      openQuestions: [{ id: "q1", text: "Which tenant owns this?" }],
    } as unknown as BuilderPrdDocument;

    expect(() => prdToMarkdown(malformed, meta)).not.toThrow();
    expect(prdToMarkdown(malformed, meta)).toContain("- Which tenant owns this?");
  });
});

describe("prdExportFilename", () => {
  it("slugs the PRD title and stamps the version, so two downloads are tellable apart", () => {
    expect(prdExportFilename(prd, meta, "md")).toBe("per-tenant-toggles-v4.md");
    expect(prdExportFilename(prd, meta, "pdf")).toBe("per-tenant-toggles-v4.pdf");
  });

  it("falls back to the session title while the agent has not titled the PRD", () => {
    const untitled = { ...prd, title: "" } as unknown as BuilderPrdDocument;
    expect(prdExportFilename(untitled, meta, "pdf")).toBe("session-fallback-title-v4.pdf");
  });

  it("never produces a bare extension when nothing sluggable is left", () => {
    const untitled = { ...prd, title: "···" } as unknown as BuilderPrdDocument;
    expect(prdExportFilename(untitled, { ...meta, sessionTitle: "" }, "md")).toBe("prd-v4.md");
  });
});

describe("downloadPrdPdf", () => {
  it("writes the document's content and saves under the versioned filename", () => {
    pdfCalls.text = [];
    pdfCalls.saved = [];

    downloadPrdPdf(prd, meta);

    expect(pdfCalls.saved).toEqual(["per-tenant-toggles-v4.pdf"]);
    expect(pdfCalls.text).toContain("Per-tenant toggles");
    expect(pdfCalls.text).toContain("Requirements");
    expect(pdfCalls.text).toContain("•  Which tenant owns this?");
    // Markdown syntax is flattened rather than printed literally — jsPDF's
    // core fonts have no renderer for it.
    expect(pdfCalls.text).toContain("New tenant_settings column.");
    expect(pdfCalls.text.some(line => line.includes("**"))).toBe(false);
  });
});
