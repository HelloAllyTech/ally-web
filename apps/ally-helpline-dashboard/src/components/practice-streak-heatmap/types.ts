import { PracticeStreakGroupBy } from "@types";

export interface PracticeStreakHeatmapProps {
  /** Optional extra classes for the outer container. */
  className?: string;
  /** Grouping shown on first render. Defaults to DAY. */
  defaultGroupBy?: PracticeStreakGroupBy;
  /**
   * Takes the user to somewhere they can practise. Supplied by the host page so
   * this component stays free of router and simulation dependencies; when it is
   * omitted the call to action is simply not rendered.
   */
  onStartPractice?: () => void;
}
