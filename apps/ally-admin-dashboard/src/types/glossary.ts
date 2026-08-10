/**
 * Per-language glossary types (mirrors ally-be language_glossary_sections).
 * The glossary "constrains and corrects" a language the LLM half-knows:
 * Tier 0 (`injectionMode: "always"`) sections compile into a token-capped
 * style card injected into every agent turn; `"retrieved"` sections join
 * knowledge retrieval. Prompt text is compiled from published entries only.
 */

export type GlossaryEntryStatus = "proposed" | "accepted" | "rejected";

export type GlossaryInjectionMode = "always" | "retrieved";

export type GlossarySectionStatus = "draft" | "published" | "archived";

/** A consolidation proposal: a markdown line awaiting accept/reject review. */
export interface GlossaryEntry {
  id: string;
  markdown: string;
  status: GlossaryEntryStatus;
  importance?: number;
  provenance?: {
    source?: "seed" | "consolidation" | "manual";
    annotationIds?: string[];
  };
}

export interface LanguageGlossarySection {
  id: string;
  languageId: number;
  organizationId?: string | null;
  sectionCode: string;
  title: string;
  /** The glossary body: plain markdown, served to the agent as-is. */
  content: string;
  /** Consolidation proposals awaiting review. */
  entries: GlossaryEntry[];
  retrievalHint?: string | null;
  injectionMode: GlossaryInjectionMode;
  status: GlossarySectionStatus;
  importance?: number | null;
  provenance?: Record<string, unknown> | null;
  version: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GlossarySectionView {
  section: LanguageGlossarySection;
  /** o200k tokens of this section's compiled prompt text (published entries) */
  compiledTokens: number;
}

export interface GlossaryListResponse {
  sections: GlossarySectionView[];
  /** compiled tokens of the published always-set */
  tier0Tokens: number;
  tier0TokenCap: number;
}

export interface UpsertGlossarySectionPayload {
  title: string;
  content: string;
  retrievalHint?: string;
  injectionMode: GlossaryInjectionMode;
  importance?: number;
}

export interface GenerateGlossaryResult {
  created: string[];
  updated: string[];
  skipped: string[];
}

export interface ConsolidateGlossaryResult {
  annotationsConsidered: number;
  proposed: number;
  skippedDuplicates: number;
  sections: string[];
}

export interface BackfillGlossariesOutcome {
  languageId: number;
  value: string;
  created: string[];
  updated: string[];
  skipped: string[];
  error?: string;
}

/**
 * Deterministic avoid-list adherence (LANGUAGE_GLOSSARY_DESIGN.md §9/§10) —
 * a regex scan of agent transcripts against the glossary's own `say "X"
 * (avoid: "Y")` pairs, no LLM. Complements the judge's style dimensions with
 * a literal rule-following signal. Populated only by an explicit backfill
 * scan (or, per-session, the read-only preview on the session detail page) —
 * a language absent from the overview has simply never been scanned.
 */
export interface GlossaryTopTerm {
  term: string;
  sectionCode: string;
  count: number;
}

/** Per-language adherence rollup: violation rate + most-violated terms. */
export interface GlossaryAdherenceSummary {
  sessionCount: number;
  totalViolations: number;
  avgViolationsPerSession: number;
  cleanSessions: number;
  topTerms: GlossaryTopTerm[];
}

/** One row of the all-languages adherence overview (the dashboard landing view). */
export interface GlossaryAdherenceOverviewRow {
  languageId: number;
  languageLabel: string;
  /** e.g. "ml-IN" — the same code the page-level language picker uses. */
  languageValue: string;
  sessionCount: number;
  totalViolations: number;
  avgViolationsPerSession: number;
  cleanSessions: number;
}

export interface BackfillGlossaryAdherenceResult {
  scanned: number;
  reported: number;
  skipped: number;
}
