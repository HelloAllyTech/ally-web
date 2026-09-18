export interface ScenarioCardProps {
  coverImage: string;
  description: string;
  onClick: () => void;
  title: string;
  isComingSoon?: boolean;
  totalScenarios?: number;
  completedScenarios?: number;
  triggerWarnings?: TriggerChipItemWarning[];
  isPathway?: boolean; // New prop for pathway check
  simulationCount?: number; // New prop for simulation count
  /**
   * How many times the learner has completed this scenario. Only meaningful
   * for a standalone scenario — pathways, cases and courses show progress via
   * `totalScenarios`/`completedScenarios` instead. Undefined or 0 = no badge.
   */
  attemptCount?: number;
}

export interface TriggerChipItemWarning {
  id: number;
  name: string;
}
