export interface SimulationReviewProps {
  readFilter: string;
  sortBy: string;
  /**
   * When set, restricts the feed to shared-for-review sessions of a single
   * scenario (roleplay agent). Used by the scenario detail page's peer-sessions
   * drawer; omitted on the full /review feed.
   */
  scenarioId?: number;
}

export interface ScribeReviewProps {
  readFilter: string;
  sortBy: string;
}
