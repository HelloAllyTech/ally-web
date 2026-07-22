/**
 * Per-language glossary types (mirrors ally-be language_glossary_sections).
 * The glossary "constrains and corrects" a language the LLM half-knows:
 * Tier 0 (`injectionMode: "always"`) sections compile into a token-capped
 * style card injected into every agent turn; `"retrieved"` sections join
 * knowledge retrieval. Prompt text is compiled from published entries only.
 */

export type GlossaryEntryType = "term_pair" | "rule" | "pattern";

export type GlossaryEntryStatus = "published" | "proposed" | "rejected";

export type GlossaryInjectionMode = "always" | "retrieved";

export type GlossarySectionStatus = "draft" | "published" | "archived";

export interface GlossaryEntry {
  id: string;
  type: GlossaryEntryType;
  /** term_pair: English scaffolding term */
  english?: string;
  /** term_pair: colloquial spoken form (native script) */
  preferred?: string;
  /** term_pair: literary/formal form to avoid (native script) */
  avoid?: string;
  /** rule/pattern: one-line rule or conversational move (English) */
  text?: string;
  note?: string;
  /** native-script example sentences */
  examples?: string[];
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
  entries: GlossaryEntry[];
  retrievalHint?: string;
  injectionMode: GlossaryInjectionMode;
  importance?: number;
}

export interface GenerateGlossaryResult {
  created: string[];
  updated: string[];
  skipped: string[];
}
