import { ReactNode } from "react";

export interface FallbackUIProps {
  icon: ReactNode;
  theme?: "light" | "dark";
  isLoading?: boolean;
  mainMessage: string;
  description: string;
  className?: string;
  button?: {
    text: string;
    onClick: () => void;
  };
}
