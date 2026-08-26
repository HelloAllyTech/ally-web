export enum ScenarioVersionStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
}

export type ScenarioVersion = {
  id: string;
  scenarioId: number;
  versionNumber: number;
  name?: string | null;
  /** Full UpdateScenarioDto-shaped snapshot of the studio form. */
  config: Record<string, unknown>;
  status: ScenarioVersionStatus;
  /**
   * Server-computed: this version MIRRORS the live scenario rather than holding
   * a snapshot of its own. Editing it means editing the live record (the
   * studio's default state, when no version is selected), so its `config` is a
   * stale seed that must never be loaded into the form — the live GET is the
   * source of truth. Set on the list endpoint only.
   */
  isLive?: boolean;
  parentVersionId?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Display label for a version: optional code name + auto version number,
 * e.g. "warmer opener · v3", falling back to "v3" when unnamed.
 */
export const formatVersionLabel = (v: { name?: string | null; versionNumber: number }): string => {
  const auto = `v${v.versionNumber}`;
  const name = v.name?.trim();
  // Ignore a redundant name that's just the auto label (e.g. backfilled "v1").
  return name && name !== auto ? `${name} · ${auto}` : auto;
};

export type CreateScenarioVersionInput = {
  scenarioId: string | number;
  name?: string;
  /** Branch from this version; defaults server-side to the published version. */
  fromVersionId?: string;
  /** Create a blank draft from scratch (no cloned data). */
  empty?: boolean;
};

export type UpdateScenarioVersionInput = {
  scenarioId: string | number;
  versionId: string;
  name?: string;
  config?: Record<string, unknown>;
};
