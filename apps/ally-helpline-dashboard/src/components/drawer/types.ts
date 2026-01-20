import { ReactNode } from "react";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  title?: string | ReactNode;
  drawerClassName?: string;
  bodyClassName?: string;
  headerButtons?: {
    alt: string;
    icon: ReactNode;
    onClick: () => void;
    show?: boolean;
    text?: string;
  }[];
}
