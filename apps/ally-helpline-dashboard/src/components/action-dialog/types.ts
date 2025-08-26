import { ReactNode } from "react";

export interface ActionDialogProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  primaryButton: {
    label: string;
    onClick: () => void | null;
    variant: "primary" | "destructive" | "secondary";
  } | null;
  secondaryButton: {
    label: string;
    onClick: () => void | null;
  } | null;
}
