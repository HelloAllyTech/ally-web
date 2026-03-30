import { PathwayScenario, PathwayScenarioStatus } from "@types";

export interface PathwayScenarioCardProps {
  scenario: PathwayScenario;
  index: number;
  onScenarioClick: (scenarioId: number, status: PathwayScenarioStatus) => void;
  onViewSummary: (sessionId: string) => void;
}
