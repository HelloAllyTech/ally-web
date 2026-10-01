import jsPDF from "jspdf";

import { en } from "@constants";
import { BuilderChatMessage, BuilderPrdDocument } from "@types";
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
  /** The admin who started the session — the PDF's "Built by" line. */
  createdByName?: string | null;
  /**
   * The interview feed, for the PDF's transcript appendix. PDF only: the
   * Markdown export is the document a person pastes into a ticket, and the
   * build never reads either file — it works from the PRD on the server.
   */
  transcript?: BuilderChatMessage[];
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** The prose sections, in the order PrdDocPanel reads them. */
const PROSE_SECTIONS: (keyof BuilderPrdDocument)[] = [
  "summary",
  "problem",
  "usersAndContext",
  "existingBehaviour",
  "whereChangesBelong",
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
 * Times, jsPDF's built-in serif. A core font costs nothing to embed and needs
 * no async font load, so the download stays a synchronous click; the price is
 * the WinAnsi character set, which `toPdfText` below accounts for.
 */
const PDF_FONT = "times";

/** Ally blue, from the wordmark — used for the logo and the transcript speakers. */
const BRAND_RGB: [number, number, number] = [38, 77, 142];

/**
 * The Ally wordmark (`assets/svg/ally.svg`, viewBox 0 0 48 24), drawn as
 * vector paths rather than placed as an image: jsPDF cannot set SVG, and
 * rasterising it would need a canvas and an async load for a download button.
 * The path uses absolute M/L/H/V/C/Z commands only, which is all
 * `logoPathOps` understands.
 */
const ALLY_LOGO_PATH =
  "M0.383565 17.64L2.30357 16.92L8.90357 0.959999H9.62357L16.4636 17.28L17.6636 17.64V18H14.7836C13.9516 18 13.2716 17.816 12.7436 17.448C12.2156 17.064 11.8236 16.568 11.5676 15.96L10.3436 13.08H4.60757L3.02357 16.92L4.82357 17.64V18H0.383565V17.64ZM4.84757 12.48H10.1036L7.46357 6.168L4.84757 12.48ZM18.2088 17.64L19.6488 17.28V1.92L18.2088 1.56V1.2H21.3288C22.7688 1.2 23.4888 1.92 23.4888 3.36V17.28L24.9288 17.64V18H18.2088V17.64ZM26.4378 17.64L27.8778 17.28V1.92L26.4378 1.56V1.2H29.5578C30.9978 1.2 31.7178 1.92 31.7178 3.36V17.28L33.1578 17.64V18H26.4378V17.64ZM37.3067 23.16C36.5867 23.16 36.0267 22.968 35.6267 22.584C35.2267 22.2 35.0267 21.672 35.0267 21C35.0267 20.392 35.1867 19.92 35.5067 19.584C35.8427 19.248 36.2827 19.08 36.8267 19.08C36.9547 19.08 37.0827 19.088 37.2107 19.104C37.3387 19.136 37.4267 19.152 37.4747 19.152L37.7867 19.2V22.44C38.2507 22.36 38.6587 22.104 39.0107 21.672C39.3627 21.24 39.7547 20.496 40.1867 19.44L40.6667 18.24L34.4267 6.72L33.2267 6.36V6H36.2267C37.0587 6 37.7147 6.176 38.1947 6.528C38.6907 6.864 39.1147 7.368 39.4667 8.04L42.4667 13.584L44.9867 7.08L43.1867 6.36V6H47.6267V6.36L45.7067 7.08L40.9067 19.44C40.3947 20.752 39.8507 21.696 39.2747 22.272C38.6987 22.864 38.0427 23.16 37.3067 23.16Z";

/** Width of the drawn wordmark in mm; height follows from the 2:1 viewBox. */
const LOGO_WIDTH_MM = 26;

type PathOp = { op: "m" | "l" | "c" | "h"; c: number[] };

/** SVG path data → jsPDF `path()` ops, scaled and offset into page space. */
export const logoPathOps = (d: string, scale: number, x0: number, y0: number): PathOp[] => {
  const ops: PathOp[] = [];
  const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let i = 0;
  let command = "";
  let x = 0;
  let y = 0;
  const num = () => Number(tokens[i++]);
  const at = (px: number, py: number) => [x0 + px * scale, y0 + py * scale];

  while (i < tokens.length) {
    if (/^[A-Z]$/i.test(tokens[i])) command = tokens[i++].toUpperCase();
    switch (command) {
      case "M":
        x = num();
        y = num();
        ops.push({ op: "m", c: at(x, y) });
        // Coordinates after an M without a new letter are implicit L's.
        command = "L";
        break;
      case "L":
        x = num();
        y = num();
        ops.push({ op: "l", c: at(x, y) });
        break;
      case "H":
        x = num();
        ops.push({ op: "l", c: at(x, y) });
        break;
      case "V":
        y = num();
        ops.push({ op: "l", c: at(x, y) });
        break;
      case "C": {
        const [x1, y1, x2, y2] = [num(), num(), num(), num()];
        x = num();
        y = num();
        ops.push({ op: "c", c: [...at(x1, y1), ...at(x2, y2), ...at(x, y)] });
        break;
      }
      case "Z":
        ops.push({ op: "h", c: [] });
        command = "";
        break;
      default:
        // Unknown token — skip it rather than loop forever.
        i += 1;
        break;
    }
  }
  return ops;
};

/** The characters WinAnsi adds on top of Latin-1, which core fonts can set. */
const WIN_ANSI_EXTRAS = new Set(Array.from("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"));

/** Common agent-written symbols with a faithful ASCII spelling. */
const PDF_SUBSTITUTES: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "⇒": "=>",
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  "≈": "~",
  "✓": "-",
  "✔": "-",
  "✗": "x",
  "✘": "x",
  "‐": "-",
  "‑": "-",
  "−": "-",
  " ": " ",
  " ": " ",
  "​": "",
  "‍": "",
  "️": "",
  "\t": "    ",
};

/**
 * Make text settable in a core font. Anything outside WinAnsi would otherwise
 * print as mojibake — an arrow in an agent's sentence turning into `!'` is
 * worse than an honest `->`. Emoji are dropped; any other unsupported glyph
 * (another script, say) becomes `?` so the gap is at least visible.
 */
export const toPdfText = (text: string): string =>
  Array.from(text)
    .map(ch => {
      if (ch in PDF_SUBSTITUTES) return PDF_SUBSTITUTES[ch];
      if ((ch.codePointAt(0) ?? 0) <= 0xff || WIN_ANSI_EXTRAS.has(ch)) return ch;
      return /\p{Extended_Pictographic}/u.test(ch) ? "" : "?";
    })
    .join("");

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

/**
 * Inline markdown → plain text: emphasis, code ticks, and link syntax.
 *
 * Code spans are set aside before emphasis is stripped, and `_` only counts as
 * emphasis at a word boundary — otherwise `tenant_settings.banner_enabled`
 * loses its underscores, and an identifier is exactly what a reader copies.
 */
const inline = (text: string): string => {
  const code: string[] = [];
  return text
    .replace(/`([^`]*)`/g, (_match, body: string) => `\uE000${code.push(body) - 1}\uE000`)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1 ($2)")
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/(?<!\w)(_{1,3})(?!\s)(.*?\S)\1(?!\w)/g, "$2")
    .replace(/\uE000(\d+)\uE000/g, (_match, index: string) => code[Number(index)])
    .replace(/^>\s?/, "")
    .trim();
};

/** PDF-only blocks: a transcript speaker line and a page break. */
type PdfBlock = PrdBlock | { kind: "speaker"; text: string } | { kind: "pageBreak" };

/**
 * The interview as the PDF's closing appendix — the record of who decided
 * what, and how. Read from the same feed the chat renders, so a question card
 * and the answer locked onto it come out together, the way the admin saw them.
 *
 * Tool chips are left out: they are the agent's working (`read_file`,
 * `search_code`), not part of the conversation a stakeholder is reading.
 */
export const transcriptToBlocks = (
  messages: BuilderChatMessage[],
  authorName: string,
): PdfBlock[] => {
  const strings = en.builder.prd.export.transcript;
  const blocks: PdfBlock[] = [
    { kind: "pageBreak" },
    { kind: "h2", text: strings.heading },
    { kind: "placeholder", text: strings.intro },
  ];
  const feed = asArray<BuilderChatMessage>(messages);
  if (!feed.length) {
    blocks.push({ kind: "placeholder", text: strings.empty });
    return blocks;
  }

  let questionNumber = 0;
  for (const message of feed) {
    const content = asAgentText(message.content).trim();

    if (message.question) {
      questionNumber += 1;
      const { question } = message;
      blocks.push({ kind: "speaker", text: strings.question(questionNumber) });
      const prompt = asAgentText(question.prompt).trim();
      if (prompt) blocks.push({ kind: "md", text: prompt });
      const rationale = asAgentText(question.rationale).trim();
      if (rationale) blocks.push({ kind: "placeholder", text: strings.whyAsked(rationale) });

      const options = asArray<NonNullable<typeof question.options>[number]>(question.options);
      if (options.length) {
        const chosen = new Set(asArray<string>(message.answeredAnswer?.selectedOptionIds));
        blocks.push({ kind: "p", text: strings.options });
        options.forEach(option => {
          const tags = [
            option.recommended ? strings.recommended : "",
            chosen.has(option.id) ? strings.chosen : "",
          ].filter(Boolean);
          const description = asAgentText(option.description).trim();
          blocks.push({
            kind: "bullet",
            text: [
              asAgentText(option.label).trim(),
              description ? ` — ${description}` : "",
              tags.length ? ` (${tags.join(", ")})` : "",
            ].join(""),
          });
        });
      }

      blocks.push({ kind: "speaker", text: strings.answerBy(authorName) });
      const answer = asAgentText(message.answeredWith).trim();
      blocks.push(
        answer ? { kind: "md", text: answer } : { kind: "placeholder", text: strings.notAnswered },
      );
      continue;
    }

    const speaker = message.role === "user" ? authorName : strings.builder;
    const notes: string[] = [];
    if (message.error) notes.push(strings.failedTurn(asAgentText(message.error)));
    if (message.interrupted) notes.push(strings.interrupted);
    if (!content && !notes.length) continue;

    blocks.push({ kind: "speaker", text: speaker });
    if (content) blocks.push({ kind: "md", text: content });
    notes.forEach(note => blocks.push({ kind: "placeholder", text: note }));
  }
  return blocks;
};

export const prdToPdf = (prd: BuilderPrdDocument, meta: PrdExportMeta): jsPDF => {
  const strings = en.builder.prd.export;
  const doc = new jsPDF();
  const authorName = asAgentText(meta.createdByName).trim() || strings.unknownAuthor;
  const now = meta.now ?? new Date();
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
      brand?: boolean;
      /** Column width for a wrapped value that does not start at the margin. */
      width?: number;
    },
  ) => {
    const indent = options.indent ?? 0;
    doc.setFont(PDF_FONT, options.style);
    doc.setFontSize(options.size);
    if (options.brand) doc.setTextColor(...BRAND_RGB);
    else doc.setTextColor(options.grey ? 110 : 25);
    const lineHeight = options.size * 0.5;
    const lines: string[] = doc.splitTextToSize(
      toPdfText(text),
      options.width ?? PAGE.width - indent,
    );
    y += options.spaceBefore ?? 0;
    for (const line of lines) {
      newPageIfNeeded(lineHeight);
      doc.text(line, PAGE.marginX + indent, y);
      y += lineHeight;
    }
    y += options.spaceAfter ?? 0;
  };

  const rule = (spaceAfter: number) => {
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(PAGE.marginX, y, PAGE.marginX + PAGE.width, y);
    y += spaceAfter;
  };

  /* Cover: the wordmark, then the title, then who/what/when as label rows. */
  const drawLogo = () => {
    const scale = LOGO_WIDTH_MM / 48;
    doc.setFillColor(...BRAND_RGB);
    doc.path(logoPathOps(ALLY_LOGO_PATH, scale, PAGE.marginX, y));
    // Even-odd so the counter in the "A" stays open.
    doc.fillEvenOdd();
    // Clear the title's ascenders, which rise above its baseline.
    y += 24 * scale + 13;
  };

  const drawDetails = (title: string) => {
    const labelWidth = 26;
    const rows: [string, string][] = [
      [strings.details.prdName, title],
      [
        strings.details.date,
        now.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" }),
      ],
      [strings.details.builtBy, authorName],
      [strings.details.version, `v${meta.versionNumber}`],
      [strings.details.repos, meta.repos.length ? meta.repos.join(", ") : en.builder.noReposYet],
    ];
    rule(5);
    for (const [label, value] of rows) {
      const rowTop = y;
      write(label, { size: 9.5, style: "bold", grey: true });
      const afterLabel = y;
      y = rowTop;
      write(value, {
        size: 10.5,
        style: "normal",
        indent: labelWidth,
        width: PAGE.width - labelWidth,
      });
      y = Math.max(y, afterLabel) + 1.2;
    }
    y += 2;
    rule(6);
  };

  const render = (block: PdfBlock) => {
    switch (block.kind) {
      case "title":
        drawLogo();
        write(block.text, { size: 22, style: "bold", spaceAfter: 4 });
        drawDetails(block.text);
        break;
      case "meta":
        // Carried by the details rows above instead.
        break;
      case "pageBreak":
        doc.addPage();
        y = PAGE.top;
        break;
      case "h2":
        write(block.text, { size: 15, style: "bold", spaceBefore: 5, spaceAfter: 2 });
        break;
      case "h3":
        write(block.text, { size: 12, style: "bold", spaceBefore: 3, spaceAfter: 1 });
        break;
      case "speaker":
        write(block.text, {
          size: 10.5,
          style: "bold",
          brand: true,
          spaceBefore: 4,
          spaceAfter: 1,
        });
        break;
      case "p":
        write(block.text, { size: 11, style: "bold", spaceAfter: 1 });
        break;
      case "bullet":
        // The bullet glyph is drawn as part of the first line's text and the
        // wrap is indented, so a long criterion hangs under its own text
        // rather than under the dot.
        write(`•  ${block.text}`, { size: 11, style: "normal", indent: 4, spaceAfter: 0.5 });
        break;
      case "placeholder":
        write(block.text, { size: 10.5, style: "italic", grey: true, spaceAfter: 1 });
        break;
      case "md":
        // Agent markdown: flatten, then render the pieces it produced. The
        // recursion is one level deep by construction — flattenMarkdown never
        // emits an `md` block holding markdown, only plain lines.
        for (const inner of flattenMarkdown(block.text)) {
          if (inner.kind === "md") {
            write(inner.text, { size: 11, style: "normal", spaceAfter: 1.5 });
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
  if (meta.transcript) transcriptToBlocks(meta.transcript, authorName).forEach(render);

  // Page numbers last, once the count is known — a PRD that runs to eight
  // pages gets printed and handed round, and loose pages need numbers.
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(strings.pageLabel(page, pageCount), PAGE.marginX + PAGE.width, PAGE.bottom + 8, {
      align: "right",
    });
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
