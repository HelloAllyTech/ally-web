import { ReactNode } from "react";

export interface FallbackUIProps {
  image: ReactNode;
  isLoading?: boolean;
  mainMessage: string;
  description: string;
  className?: string;
  button?: {
    text: string;
    onClick: () => void;
  };
}
