import { BugFinding, BugFindingStatus } from "@types";

/**
 * The staff bug report's structured answers (admin "Report a bug"), in the
 * product words a staff member thinks in. Mirrors ally-be's
 * `bug-report-brief.util.ts`, which folds them into the brief Bug Hunter reads
 * and maps a surface to a repo — staff never see a repo name unless they open
 * the advanced picker.
 */
export const BUG_REPORT_SURFACES = [
  { id: "helpline_web", label: "Helpline web app" },
  { id: "admin", label: "Admin dashboard" },
  { id: "mobile", label: "Mobile app" },
  { id: "voice_roleplay", label: "Voice roleplay" },
  { id: "whatsapp", label: "WhatsApp bot" },
  { id: "not_sure", label: "Not sure" },
] as const;
export type BugReportSurface = (typeof BUG_REPORT_SURFACES)[number]["id"];

export const BUG_REPORT_FREQUENCIES = [
  { id: "every_time", label: "Every time" },
  { id: "sometimes", label: "Sometimes" },
  { id: "once", label: "Once so far" },
] as const;
export type BugReportFrequency = (typeof BUG_REPORT_FREQUENCIES)[number]["id"];

export const BUG_REPORT_IMPACTS = [
  { id: "blocks", label: "Blocks my work" },
  { id: "wrong", label: "Gives a wrong result" },
  { id: "cosmetic", label: "Looks wrong" },
] as const;
export type BugReportImpact = (typeof BUG_REPORT_IMPACTS)[number]["id"];

/** Fewest characters "What went wrong?" needs: a sentence, not a word. */
export const BUG_REPORT_MIN_DESCRIPTION = 30;

/** `datetime-local` wants local time without a zone; this is "now" in that shape. */
export const localDateTimeValue = (d: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** A `datetime-local` value back to ISO 8601, or undefined when it is not a date. */
export const toIsoOrUndefined = (local: string): string | undefined => {
  if (!local) return undefined;
  const t = new Date(local).getTime();
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "by",
  "when",
  "then",
  "than",
  "not",
  "no",
  "does",
  "did",
  "do",
  "i",
  "we",
  "you",
  "my",
  "me",
  "as",
  "if",
  "so",
  "up",
  "out",
  "page",
  "screen",
  "button",
  "click",
  "clicked",
  "shows",
  "show",
  "get",
  "gets",
  "got",
  "after",
  "before",
  "still",
  "again",
  "also",
  "just",
  "very",
  "there",
  "into",
]);

export const significantWords = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w)),
  );

const CLOSED: ReadonlySet<string> = new Set([
  BugFindingStatus.DISMISSED,
  BugFindingStatus.REJECTED,
  BugFindingStatus.CANCELLED,
  BugFindingStatus.RELEASED,
]);

export interface SimilarFinding {
  finding: BugFinding;
  /** Shared significant words, most first. */
  overlap: number;
}

/**
 * The open findings that read like what the reporter is typing, best match
 * first — shown as "Already reported?" before Send. A duplicate human report
 * costs a Verifier run and a second row a person has to merge, so the three
 * most similar are worth a glance. Pure word overlap on title and
 * description, which is enough for "same bug, different words" most of the
 * time and never hides anything: the reporter can always still send.
 */
export const similarFindings = (
  text: string,
  findings: BugFinding[],
  limit = 3,
  minOverlap = 2,
): SimilarFinding[] => {
  const words = significantWords(text);
  if (words.size < 2) return [];
  return findings
    .filter(f => !CLOSED.has(f.status))
    .map(finding => {
      const theirs = significantWords(`${finding.title} ${finding.description ?? ""}`);
      let overlap = 0;
      words.forEach(w => {
        if (theirs.has(w)) overlap += 1;
      });
      return { finding, overlap };
    })
    .filter(s => s.overlap >= minOverlap)
    .sort((a, b) => b.overlap - a.overlap || a.finding.title.localeCompare(b.finding.title))
    .slice(0, limit);
};
