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
