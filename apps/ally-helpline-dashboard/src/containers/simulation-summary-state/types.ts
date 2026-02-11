import { SimulationSummary } from "@src/types";

export interface SimulationSummaryProps {
  className?: string;
  onSummaryFetch?: (summary: SimulationSummary) => void;
  summaryId: string;
  hideSection?: boolean;
}
