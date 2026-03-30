import { ButtonHTMLAttributes, ReactNode } from "react";

export const ButtonVariant = {
  PRIMARY: "primary",
  DESTRUCTIVE: "destructive",
  SECONDARY: "secondary",
  ICON: "icon",
  TEXT: "text",
} as const;

export type ButtonVariantType = (typeof ButtonVariant)[keyof typeof ButtonVariant];

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariantType;
  className?: string;
  children?: ReactNode;
  fullWidth?: boolean;
}
