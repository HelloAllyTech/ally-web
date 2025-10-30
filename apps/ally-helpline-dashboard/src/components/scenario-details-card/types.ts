export interface ScenarioDetailsCardProps {
  coverImage: string;
  isStarting: boolean;
  longDescription?: string;
  onStart: () => void;
  title: string;
  noCredits?: boolean;
}
