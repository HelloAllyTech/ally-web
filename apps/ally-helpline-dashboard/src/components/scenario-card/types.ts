export interface ScenarioCardProps {
  coverImage: string;
  description: string;
  onClick: () => void;
  title: string;
  isComingSoon?: boolean;
  totalScenarios?: number;
  completedScenarios?: number;
}
