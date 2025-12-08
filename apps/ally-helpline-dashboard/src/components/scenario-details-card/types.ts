export interface ScenarioDetailsCardProps {
  coverImage: string;
  coverVideo?: string;
  isStarting: boolean;
  longDescription?: string;
  onStart: () => void;
  title: string;
  noCredits?: boolean;
  triggerWarnings?: TriggerChipItemWarning[];
}

export interface TriggerChipItemWarning {
  id: number;
  name: string;
}
