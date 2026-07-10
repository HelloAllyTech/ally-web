import { PracticeStreakGroupBy } from "@types";

export interface PracticeStreakHeatmapProps {
  /** Optional extra classes for the outer container. */
  className?: string;
  /** Grouping shown on first render. Defaults to DAY. */
  defaultGroupBy?: PracticeStreakGroupBy;
}
