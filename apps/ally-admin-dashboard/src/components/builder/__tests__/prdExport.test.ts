import { describe, expect, it, vi } from "vitest";

import type { BuilderChatMessage, BuilderPrdDocument } from "@types";

// @constants reads off the @components barrel at module-eval time (see the
// other builder tests), so the barrel is stubbed rather than loaded for real.
vi.mock("@components", () => ({ cellTypes: {} }));

// jsPDF is a canvas-adjacent dependency and this suite is about *what* is
// written, not how it is typeset — so the document is a recorder. The one
// thing worth asserting through it is that a section reaches the PDF at all.
const pdfCalls: {
  text: string[];
  saved: string[];
  fonts: string[];
  paths: unknown[][];
  evenOddFills: number;
  pagesAdded: number;
} = { text: [], saved: [], fonts: [], paths: [], evenOddFills: 0, pagesAdded: 0 };
const resetPdfCalls = () =>
  Object.assign(pdfCalls, {
    text: [],
    saved: [],
    fonts: [],
    paths: [],
    evenOddFills: 0,
    pagesAdded: 0,
  });
vi.mock("jspdf", () => ({
  default: class {
    setFont(name: string) {
      pdfCalls.fonts.push(name);
    }
    setFontSize() {}
    setTextColor() {}
    setDrawColor() {}
    setFillColor() {}
    setLineWidth() {}
    line() {}
    path(ops: unknown[]) {
      pdfCalls.paths.push(ops);
    }
    fillEvenOdd() {
      pdfCalls.evenOddFills += 1;
    }
    setPage() {}
    addPage() {
      pdfCalls.pagesAdded += 1;
    }
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
import {
  downloadPrdPdf,
  logoPathOps,
  prdExportFilename,
  prdToMarkdown,
  toPdfText,
  type PrdExportMeta,
} from "../prdExport";

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
    resetPdfCalls();

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

describe("downloadPrdPdf — cover", () => {
  it("leads with the Ally logo, drawn as a vector with its counters open", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: "Asha Rao" });

    expect(pdfCalls.paths).toHaveLength(1);
    expect(pdfCalls.evenOddFills).toBe(1);
  });

  it("sets every line in a serif face", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: "Asha Rao" });

    expect(new Set(pdfCalls.fonts)).toEqual(new Set(["times"]));
  });

  it("names the PRD, the date, and the admin who built it", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: "Asha Rao" });

    expect(pdfCalls.text).toEqual(
      expect.arrayContaining(["PRD name", "Date", "Built by", "Asha Rao", "Version", "v4"]),
    );
  });

  it("says the author is unknown rather than leaving the row blank", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: null });

    expect(pdfCalls.text).toContain("Unknown admin");
  });
});

describe("downloadPrdPdf — transcript", () => {
  const transcript: BuilderChatMessage[] = [
    { id: "u1", role: "user", content: "Tenants need to switch the banner off." },
    {
      id: "a1",
      role: "assistant",
      content: "Got it — a **per-tenant** switch.",
      toolNotes: ["read_file"],
    },
    {
      id: "q1",
      role: "assistant",
      content: "",
      question: {
        id: "where",
        prompt: "Where should the toggle live?",
        kind: "singleSelect",
        rationale: "Decides which repo owns the change",
        options: [
          {
            id: "settings",
            label: "Org settings",
            description: "Next to the others",
            recommended: true,
          },
          { id: "banner", label: "On the banner" },
        ],
      },
      answeredWith: "Org settings",
      answeredAnswer: { selectedOptionIds: ["settings"] },
    },
    {
      id: "q2",
      role: "assistant",
      content: "",
      question: { id: "who", prompt: "Who can flip it?", kind: "freeText" },
    },
    { id: "a2", role: "assistant", content: "", error: "Model timed out" },
  ];

  it("appends the whole conversation on its own page, after the PRD", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: "Asha Rao", transcript });

    const heading = pdfCalls.text.indexOf("Interview transcript");
    expect(heading).toBeGreaterThan(pdfCalls.text.indexOf("Open questions"));
    expect(pdfCalls.pagesAdded).toBeGreaterThanOrEqual(1);
    expect(pdfCalls.text).toContain("Tenants need to switch the banner off.");
    expect(pdfCalls.text).toContain("Got it — a per-tenant switch.");
  });

  it("attributes each turn to the admin by name or to Builder", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: "Asha Rao", transcript });

    expect(pdfCalls.text).toContain("Asha Rao");
    expect(pdfCalls.text).toContain("Builder");
  });

  it("keeps each question with its options, the pick, and the answer", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: "Asha Rao", transcript });

    expect(pdfCalls.text).toContain("Builder · Question 1");
    expect(pdfCalls.text).toContain("Where should the toggle live?");
    expect(pdfCalls.text).toContain("Why it was asked: Decides which repo owns the change");
    expect(pdfCalls.text).toContain("•  Org settings — Next to the others (recommended, chosen)");
    expect(pdfCalls.text).toContain("•  On the banner");
    expect(pdfCalls.text).toContain("Asha Rao · Answer");
  });

  it("marks an unanswered question and a failed turn rather than dropping them", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: "Asha Rao", transcript });

    expect(pdfCalls.text).toContain("Builder · Question 2");
    expect(pdfCalls.text).toContain("Not answered.");
    expect(pdfCalls.text).toContain("This turn failed: Model timed out");
  });

  it("leaves out tool chips, which are the agent's working rather than the conversation", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, createdByName: "Asha Rao", transcript });

    expect(pdfCalls.text.some(line => line.includes("read_file"))).toBe(false);
  });

  it("says so when there is no conversation yet", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, { ...meta, transcript: [] });

    expect(pdfCalls.text).toContain("No conversation recorded yet.");
  });

  it("is absent when no transcript is passed, and never reaches the Markdown", () => {
    resetPdfCalls();
    downloadPrdPdf(prd, meta);

    expect(pdfCalls.text).not.toContain("Interview transcript");
    expect(prdToMarkdown(prd, { ...meta, transcript })).not.toContain("Tenants need to switch");
  });
});

describe("downloadPrdPdf — inline markdown", () => {
  it("keeps the underscores in identifiers while still stripping emphasis", () => {
    resetPdfCalls();
    const withIdentifiers = {
      ...prd,
      summary: "Add `tenant_settings.banner_enabled`; read banner_enabled_at, _not_ the cache.",
    } as unknown as BuilderPrdDocument;

    downloadPrdPdf(withIdentifiers, meta);

    expect(pdfCalls.text).toContain(
      "Add tenant_settings.banner_enabled; read banner_enabled_at, not the cache.",
    );
  });
});

describe("toPdfText", () => {
  it("spells common symbols in ASCII instead of printing mojibake", () => {
    expect(toPdfText("a → b ≥ c")).toBe("a -> b >= c");
  });

  it("keeps Latin-1 and WinAnsi punctuation", () => {
    expect(toPdfText("café — “quoted” • 50€")).toBe("café — “quoted” • 50€");
  });

  it("drops emoji and marks other unsupported glyphs", () => {
    expect(toPdfText("ship it 🚀")).toBe("ship it ");
    expect(toPdfText("नमस्ते").replace(/\?/g, "")).toBe("");
  });
});

describe("logoPathOps", () => {
  it("translates absolute SVG commands into scaled jsPDF path ops", () => {
    const ops = logoPathOps("M0 0L10 0V10H0Z", 0.5, 15, 20);
    expect(ops).toEqual([
      { op: "m", c: [15, 20] },
      { op: "l", c: [20, 20] },
      { op: "l", c: [20, 25] },
      { op: "l", c: [15, 25] },
      { op: "h", c: [] },
    ]);
  });

  it("scales curve control points too", () => {
    const [, curve] = logoPathOps("M0 0C2 2 4 4 6 6", 2, 0, 0);
    expect(curve).toEqual({ op: "c", c: [4, 4, 8, 8, 12, 12] });
  });
});
