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
}

export interface TriggerChipItemWarning {
  id: number;
  name: string;
}
