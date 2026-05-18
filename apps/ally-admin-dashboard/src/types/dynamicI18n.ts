export type DynamicI18nManifest = {
  version: number;
  currentVersion: string;
  publishedAt: string;
  languages: string[];
  namespaces: string[];
  files: Record<string, string[]>;
};

export type DynamicI18nVersion = {
  version: number;
  name: string;
  current: boolean;
  updatedAt?: string;
};

export type DynamicI18nStatus = {
  manifest: DynamicI18nManifest | null;
  languages: string[];
  namespaces: string[];
  versions: DynamicI18nVersion[];
  retentionLimit: number;
};

export type DynamicI18nTranslationEntry = {
  key: string;
  value: string;
  liveValue?: string;
  changed: boolean;
  placeholders: string[];
};

export type DynamicI18nTranslationsResponse = {
  language: string;
  namespace: string;
  entries: DynamicI18nTranslationEntry[];
};

export type DynamicI18nDiffEntry = {
  key: string;
  draftValue?: string;
  liveValue?: string;
  status: "added" | "changed" | "removed" | "unchanged";
};

export type DynamicI18nDiffResponse = {
  language: string;
  namespace: string;
  entries: DynamicI18nDiffEntry[];
};

export type DynamicI18nAuditLog = {
  event: string;
  date: string;
  userName: string;
};

export type DynamicI18nAggregatedRow = {
  /** Full dotted path including namespace, e.g. "common.boxBreathing.inhale" */
  fullKey: string;
  /** Top-level namespace, e.g. "common" */
  namespace: string;
  /** Key within the namespace, e.g. "boxBreathing.inhale" — used for backend update */
  innerKey: string;
  /** Placeholders found in the canonical (English) value */
  placeholders: string[];
  /** Current draft value per language code */
  values: Record<string, string>;
  /** Last published live value per language code (empty string if not published yet) */
  liveValues: Record<string, string>;
};

export type DynamicI18nAggregatedResponse = {
  languages: string[];
  rows: DynamicI18nAggregatedRow[];
};

export type DynamicI18nAutoTranslateResult = {
  namespace: string;
  key: string;
  sourceLanguage: string;
  values: Record<string, string>;
  /** Languages where OpenAI failed; the source value was saved as fallback. */
  failed: string[];
};
