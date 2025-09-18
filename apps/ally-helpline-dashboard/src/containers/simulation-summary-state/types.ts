import { SimulationSummary } from "@src/types";

export interface SimulationSummaryProps {
  className?: string;
  isInSidebar?: boolean;
  onSummaryFetch?: (summary: SimulationSummary) => void;
  summaryId: string;
  onSummaryClose: () => void;
}
