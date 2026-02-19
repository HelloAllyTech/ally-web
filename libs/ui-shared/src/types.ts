import { ReactNode } from "react";

// TODO: Refactor export of types; refer tsconfig.app.json of helpline dashboard
export interface Resource {
  id: string;
  heading: string;
  content: string;
  category: string;
  tags: string[];
  score: number;
}

export enum SearchVariant {
  DARK = "dark",
  LIGHT = "light",
}

export interface triggerWarning {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SimulationDetailsModalProps {
  isOpen: boolean;
  showActionButtons?: boolean;
  title: string;
  description: string;
  coverImageUrl?: string;
  coverVideoUrl?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  scenarioLabel?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
  onClickOutside?: () => void;
  isPrimaryLoading?: boolean;
  primaryButtonClassName?: string;
  secondaryButtonClassName?: string;
  containerClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  imageContainerClassName?: string;
  triggerWarningsLabel?: string;
  triggerWarnings?: triggerWarning[];
  renderCustomImage?: (props: { src?: string; alt: string; className?: string }) => ReactNode;
  renderAdditionalContent?: () => ReactNode;
}
