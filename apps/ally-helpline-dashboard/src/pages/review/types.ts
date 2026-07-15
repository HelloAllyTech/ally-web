export interface SimulationReviewProps {
  readFilter: string;
  sortBy: string;
  /**
   * When set, restricts the feed to shared-for-review sessions of a single
   * scenario (roleplay agent). Used by the scenario detail page's peer-sessions
   * drawer; omitted on the full /review feed.
   */
  scenarioId?: number;
  /**
   * When true, excludes the viewer's own shared sessions so only peers' sessions
   * are shown. Used by the scenario detail page's peer-sessions drawer.
   */
  excludeOwn?: boolean;
}

export interface ScribeReviewProps {
  readFilter: string;
  sortBy: string;
}
