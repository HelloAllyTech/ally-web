import { SimulationSummary } from "@types";

export interface StarRatingProps {
  rating: number;
  setRating: (rating: number) => void;
}

export type FeedbackSectionProps = SimulationSummary;

export interface UpNextSimulationCardProps {
  simulationNumber: number;
  title: string;
  scenario: string;
  coverImage: string;
}
