import { SimulationSummary as SimulationSummaryType } from "@src/types";

export interface SimulationSummaryProps {
  className?: string;
  hideSection?: boolean;
  retryMaxReached?: boolean;
  sessionId: string;
  summaryData?: SimulationSummaryType;
}
