import { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "destructive" | "secondary" | "icon" | "text";
  className?: string;
  children?: ReactNode;
  fullWidth?: boolean;
}
