export interface ScenarioCardProps {
  coverImage: string;
  description: string;
  onClick: () => void;
  title: string;
  isComingSoon?: boolean;
  totalScenarios?: number;
  completedScenarios?: number;
  triggerWarnings?: TriggerChipItemWarning[];
}

export interface TriggerChipItemWarning {
  id: number;
  name: string;
}
