import { FC, ButtonHTMLAttributes, ReactNode } from "react";

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

const getButtonStyles = (variant: ButtonProps["variant"]) => {
  switch (variant) {
    case ButtonVariant.DESTRUCTIVE:
      return "bg-[#F93535] text-[#FFFFFF] hover:bg-destructive/90 disabled:bg-destructive/50";
    case ButtonVariant.SECONDARY:
      return "border border-[#C8C5D0] hover:bg-accent hover:text-accent-foreground disabled:bg-accent/50";
    case ButtonVariant.ICON:
      return "bg-transparent border-none hover:bg-transparent disabled:bg-transparent !p-2 !h-fit";
    case ButtonVariant.TEXT:
      return "bg-transparent border-none hover:bg-transparent disabled:bg-transparent";
    case ButtonVariant.PRIMARY:
    default:
      return "bg-[#0957D0] text-[#FFFFFF] hover:bg-primary/90 disabled:bg-primary/50";
  }
};

export const Button: FC<ButtonProps> = ({
  className,
  variant = "primary",
  fullWidth,
  children,
  ...props
}) => {
  return (
    <button
      className={`h-10 flex items-center justify-center gap-2 py-2 px-4 whitespace-nowrap text-sm font-medium rounded-[100px] 
        transition-transform duration-150 ease-out hover:-translate-y-[1px] disabled:hover:translate-y-0
        disabled:cursor-default disabled:opacity-50 ${getButtonStyles(variant)} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
