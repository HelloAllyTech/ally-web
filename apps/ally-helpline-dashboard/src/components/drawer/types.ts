import { ReactNode } from "react";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}
