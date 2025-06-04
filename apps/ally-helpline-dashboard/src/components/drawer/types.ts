import { ReactNode } from "react";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
  headerButtons?: {
    alt: string;
    icon: ReactNode;
    onClick: () => void;
  }[];
}
