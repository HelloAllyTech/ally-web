import jsPDF from "jspdf";

import { en } from "@constants";
import { BuilderPrdDocument } from "@types";
import { asAgentText, asAgentTextList } from "@utils";

/**
 * Exporting the PRD out of Builder, as Markdown or as PDF.
 *
 * Both formats are produced from ONE intermediate block list rather than from
 * two independent walks of the document. The PDF is meant to be the Markdown,
 * typeset — if a section is added to the PRD and only one exporter learns
 * about it, the two files stop describing the same document, and the person
 * who pasted the Markdown into a ticket and mailed the PDF to a stakeholder is
 * the one who finds out.
 *
 * Everything read here is agent-written, so it goes through `asAgentText` /
 * `asAgentTextList` for the same reason PrdDocPanel does: a section the agent
 * is mid-way through can hold an object where a string belongs, and an export
 * that throws on it loses the whole document rather than one heading.
 */

/** A section that is genuinely empty is exported as this, not silently dropped. */
type PrdBlock =
  | { kind: "title"; text: string }
  /** Sub-title line: repos, version, export date. */
  | { kind: "meta"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  /** Agent-written markdown, emitted verbatim to .md and flattened for PDF. */
  | { kind: "md"; text: string }
  /** Plain text — already flat, never markdown. */
  | { kind: "p"; text: string }
  | { kind: "bullet"; text: string }
  /** "Nothing here yet." — rendered in italic grey, so the gap is visible. */
  | { kind: "placeholder"; text: string };

export interface PrdExportMeta {
  /** Falls back to the session title when the agent has not titled the PRD. */
  sessionTitle: string;
  repos: string[];
  versionNumber: number;
  /** Injectable so the filename and the meta line are testable. */
  now?: Date;
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** The prose sections, in the order PrdDocPanel reads them. */
const PROSE_SECTIONS: (keyof BuilderPrdDocument)[] = [
  "summary",
  "problem",
  "usersAndContext",
  "goals",
  "nonGoals",
];

/** Test plans sit after the technical plan in the export, as they read. */
const PLAN_SECTIONS: (keyof BuilderPrdDocument)[] = ["testPlanMd", "e2ePlanMd"];

export const prdExportTitle = (prd: BuilderPrdDocument, sessionTitle: string): string =>
  asAgentText(prd.title).trim() || sessionTitle;

/**
 * Turn the PRD into the block list both exporters render.
 *
 * Section headings come from the same `en.builder.prd.sections` map the panel
 * uses, so an exported document is labelled exactly like the one on screen.
 */
export const prdToBlocks = (prd: BuilderPrdDocument, meta: PrdExportMeta): PrdBlock[] => {
  const strings = en.builder.prd;
  const labels = strings.sections;
  const blocks: PrdBlock[] = [];

  const pushSection = (label: string, value: unknown) => {
    blocks.push({ kind: "h2", text: label });
    const text = asAgentText(value).trim();
    blocks.push(text ? { kind: "md", text } : { kind: "placeholder", text: strings.emptySection });
  };

  blocks.push({ kind: "title", text: prdExportTitle(prd, meta.sessionTitle) });
  blocks.push({
    kind: "meta",
    text: strings.export.metaLine({
      version: meta.versionNumber,
      repos: meta.repos.length ? meta.repos.join(", ") : en.builder.noReposYet,
      date: (meta.now ?? new Date()).toLocaleString(),
    }),
  });

  for (const key of PROSE_SECTIONS) {
    pushSection(labels[String(key)] ?? String(key), prd[key]);
  }

  /* Requirements ─ the one section a reader is most likely to work from, so
     each requirement keeps its id, title, body and criteria rather than being
     flattened into a bullet list. */
  blocks.push({ kind: "h2", text: labels.requirements });
  const requirements = asArray<BuilderPrdDocument["requirements"][number]>(prd.requirements);
  if (requirements.length) {
    requirements.forEach((requirement, index) => {
      const id = asAgentText(requirement.id).trim();
      const title = asAgentText(requirement.title).trim();
      blocks.push({
        kind: "h3",
        text: [id, title].filter(Boolean).join(" — ") || `${index + 1}`,
      });
      const description = asAgentText(requirement.description).trim();
      if (description) blocks.push({ kind: "md", text: description });
      const criteria = asAgentTextList(requirement.acceptanceCriteria);
      if (criteria.length) {
        blocks.push({ kind: "p", text: strings.acceptanceCriteria });
        criteria.forEach(criterion => blocks.push({ kind: "bullet", text: criterion }));
      }
    });
  } else {
    blocks.push({ kind: "placeholder", text: strings.noRequirements });
  }

  /* Assumptions — the confirmed/unconfirmed status is the whole point of the
     section, so it is carried into the bullet rather than left behind with the
     Tag that renders it on screen. */
  blocks.push({ kind: "h2", text: labels.assumptions });
  const assumptions = asArray<BuilderPrdDocument["assumptions"][number]>(prd.assumptions);
  if (assumptions.length) {
    assumptions.forEach(assumption => {
      const status =
        assumption.status === "confirmed"
          ? strings.assumptionConfirmed
          : strings.assumptionUnconfirmed;
      blocks.push({ kind: "bullet", text: `[${status}] ${asAgentText(assumption.text)}` });
    });
  } else {
    blocks.push({ kind: "placeholder", text: strings.noAssumptions });
  }

  /* Technical plan */
  blocks.push({ kind: "h2", text: labels.technicalPlan });
  const repoPlans = asArray<BuilderPrdDocument["technicalPlan"]["repos"][number]>(
    prd.technicalPlan?.repos,
  );
  if (repoPlans.length) {
    repoPlans.forEach(plan => {
      blocks.push({ kind: "h3", text: asAgentText(plan.repo).trim() || strings.unnamedRepo });
      const changes = asAgentText(plan.changesMd).trim();
      blocks.push(
        changes
          ? { kind: "md", text: changes }
          : { kind: "placeholder", text: strings.emptySection },
      );
    });
  } else {
    blocks.push({ kind: "placeholder", text: strings.emptySection });
  }
  const dataModel = asAgentText(prd.technicalPlan?.dataModelMd).trim();
  if (dataModel) {
    blocks.push({ kind: "h3", text: strings.export.dataModel });
    blocks.push({ kind: "md", text: dataModel });
  }
  const api = asAgentText(prd.technicalPlan?.apiMd).trim();
  if (api) {
    blocks.push({ kind: "h3", text: strings.export.api });
    blocks.push({ kind: "md", text: api });
  }

  for (const key of PLAN_SECTIONS) {
    pushSection(labels[String(key)] ?? String(key), prd[key]);
  }

  blocks.push({ kind: "h2", text: labels.openQuestions });
  const openQuestions = asAgentTextList(prd.openQuestions);
  if (openQuestions.length) {
    openQuestions.forEach(question => blocks.push({ kind: "bullet", text: question }));
  } else {
    blocks.push({ kind: "placeholder", text: strings.noOpenQuestions });
  }

  return blocks;
};

/* ── Markdown ───────────────────────────────────────────────────────────── */

export const prdToMarkdown = (prd: BuilderPrdDocument, meta: PrdExportMeta): string => {
  const lines: string[] = [];
  for (const block of prdToBlocks(prd, meta)) {
    switch (block.kind) {
      case "title":
        lines.push(`# ${block.text}`);
        break;
      case "meta":
        lines.push(`_${block.text}_`);
        break;
      case "h2":
        lines.push(`## ${block.text}`);
        break;
      case "h3":
        lines.push(`### ${block.text}`);
        break;
      case "bullet":
        lines.push(`- ${block.text}`);
        break;
      case "p":
        lines.push(`**${block.text}**`);
        break;
      case "placeholder":
        lines.push(`_${block.text}_`);
        break;
      // Agent markdown goes out untouched — re-wrapping it is how a table or a
      // fenced block gets broken on the way to a ticket.
      case "md":
      default:
        lines.push(block.text);
        break;
    }
    lines.push("");
  }
  // Consecutive bullets should not be separated by a blank line, or every list
  // in the file renders as a loose list wherever it lands.
  return `${lines.join("\n").replace(/\n\n(?=- )/g, "\n")}`.trimEnd().concat("\n");
};

/* ── PDF ────────────────────────────────────────────────────────────────── */

const PAGE = {
  /** A4 portrait in mm — jsPDF's default unit and format. */
  marginX: 15,
  top: 20,
  bottom: 280,
  width: 180,
};

/**
 * Strip markdown down to something jsPDF's core fonts can set.
 *
 * jsPDF has no markdown renderer and embedding one would mean shipping a
 * layout engine for a download button. This keeps the *structure* a reader
 * needs — headings become bold lines, list items stay list items — and drops
 * only the syntax that would otherwise print as literal `**` and `#`.
 * Fenced code is kept verbatim, because the content inside it is the point.
 */
const flattenMarkdown = (markdown: string): PrdBlock[] => {
  const blocks: PrdBlock[] = [];
  let inFence = false;
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      blocks.push({ kind: "p", text: rawLine });
      continue;
    }
    if (!line.trim()) continue;

    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: "h3", text: inline(heading[1]) });
      continue;
    }
    const bullet = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      blocks.push({ kind: "bullet", text: inline(bullet[1]) });
      continue;
    }
    blocks.push({ kind: "md", text: inline(line) });
  }
  return blocks;
};

/** Inline markdown → plain text: emphasis, code ticks, and link syntax. */
const inline = (text: string): string =>
  text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1 ($2)")
    .replace(/(\*\*\*|___)(.*?)\1/g, "$2")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^>\s?/, "")
    .trim();

export const prdToPdf = (prd: BuilderPrdDocument, meta: PrdExportMeta): jsPDF => {
  const doc = new jsPDF();
  let y = PAGE.top;

  const newPageIfNeeded = (height: number) => {
    if (y + height > PAGE.bottom) {
      doc.addPage();
      y = PAGE.top;
    }
  };

  const write = (
    text: string,
    options: {
      size: number;
      style: "normal" | "bold" | "italic";
      indent?: number;
      spaceBefore?: number;
      spaceAfter?: number;
      grey?: boolean;
    },
  ) => {
    const indent = options.indent ?? 0;
    doc.setFont("helvetica", options.style);
    doc.setFontSize(options.size);
    doc.setTextColor(options.grey ? 120 : 30);
    const lineHeight = options.size * 0.55;
    const lines: string[] = doc.splitTextToSize(text, PAGE.width - indent);
    y += options.spaceBefore ?? 0;
    for (const line of lines) {
      newPageIfNeeded(lineHeight);
      doc.text(line, PAGE.marginX + indent, y);
      y += lineHeight;
    }
    y += options.spaceAfter ?? 0;
  };

  const render = (block: PrdBlock) => {
    switch (block.kind) {
      case "title":
        write(block.text, { size: 18, style: "bold", spaceAfter: 2 });
        break;
      case "meta":
        write(block.text, { size: 9, style: "italic", grey: true, spaceAfter: 4 });
        break;
      case "h2":
        write(block.text, { size: 13, style: "bold", spaceBefore: 4, spaceAfter: 1.5 });
        break;
      case "h3":
        write(block.text, { size: 11, style: "bold", spaceBefore: 2.5, spaceAfter: 1 });
        break;
      case "p":
        write(block.text, { size: 10, style: "bold", spaceAfter: 1 });
        break;
      case "bullet":
        // The bullet glyph is drawn as part of the first line's text and the
        // wrap is indented, so a long criterion hangs under its own text
        // rather than under the dot.
        write(`•  ${block.text}`, { size: 10, style: "normal", indent: 4, spaceAfter: 0.5 });
        break;
      case "placeholder":
        write(block.text, { size: 10, style: "italic", grey: true, spaceAfter: 1 });
        break;
      case "md":
        // Agent markdown: flatten, then render the pieces it produced. The
        // recursion is one level deep by construction — flattenMarkdown never
        // emits an `md` block holding markdown, only plain lines.
        for (const inner of flattenMarkdown(block.text)) {
          if (inner.kind === "md") {
            write(inner.text, { size: 10, style: "normal", spaceAfter: 1.5 });
          } else {
            render(inner);
          }
        }
        break;
      default:
        break;
    }
  };

  prdToBlocks(prd, meta).forEach(render);

  // Page numbers last, once the count is known — a PRD that runs to eight
  // pages gets printed and handed round, and loose pages need numbers.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      en.builder.prd.export.pageLabel(page, pageCount),
      PAGE.marginX + PAGE.width,
      PAGE.bottom + 8,
      { align: "right" },
    );
  }

  return doc;
};

/* ── Filenames and download ─────────────────────────────────────────────── */

/**
 * `Export the PRD → prd-export-v3.md`.
 *
 * The version number is in the filename on purpose: a PRD is exported more
 * than once as it settles, and two files called `prd.pdf` in a downloads
 * folder tell you nothing about which one is current.
 */
export const prdExportFilename = (
  prd: BuilderPrdDocument,
  meta: PrdExportMeta,
  extension: "md" | "pdf",
): string => {
  const slug = prdExportTitle(prd, meta.sessionTitle)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "prd"}-v${meta.versionNumber}.${extension}`;
};

/** Trigger a client-side file download. */
const download = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadPrdMarkdown = (prd: BuilderPrdDocument, meta: PrdExportMeta): void => {
  download(
    prdExportFilename(prd, meta, "md"),
    new Blob([prdToMarkdown(prd, meta)], { type: "text/markdown;charset=utf-8" }),
  );
};

export const downloadPrdPdf = (prd: BuilderPrdDocument, meta: PrdExportMeta): void => {
  prdToPdf(prd, meta).save(prdExportFilename(prd, meta, "pdf"));
};
