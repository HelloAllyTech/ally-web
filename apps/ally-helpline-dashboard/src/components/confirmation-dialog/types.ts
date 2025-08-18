import type { FC, SVGProps, ReactNode } from "react";

import type { ButtonVariantType } from "../button";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: {
    normal: string;
    italic: string;
  };
  icon?: FC<SVGProps<SVGSVGElement>>;
  content: string;
  buttonText: string;
  buttonVariant: ButtonVariantType;
  onButtonClick: () => void;
  footerText?: string;
  children?: ReactNode;
}
