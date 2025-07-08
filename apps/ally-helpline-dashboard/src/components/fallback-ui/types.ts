import { ReactNode } from "react";

export interface FallbackUIProps {
  image: ReactNode;
  mainMessage: string;
  description: string;
  className?: string;
}
