export interface ScenarioDetailsCardProps {
  coverImage: string;
  coverVideo?: string;
  /** ScenarioDifficultyLevel enum value (EASY/MEDIUM/HARD); rendered as a chip. */
  difficultyLevel?: string;
  isStarting: boolean;
  longDescription?: string;
  /** Time limit as "HH:MM:SS" (set only for timed scenarios); rendered as a duration chip. */
  maxTimeValue?: string;
  onStart: () => void;
  title: string;
  noCredits?: boolean;
  triggerWarnings?: TriggerChipItemWarning[];
  /**
   * How many times the learner has completed this scenario. Drives the
   * "Completed" chip and switches the CTA to "Practise again". Undefined or
   * 0 leaves the card exactly as it was.
   */
  attemptCount?: number;
}

export interface TriggerChipItemWarning {
  id: number;
  name: string;
}
