import { FC } from "react";

import { ButtonProps, ButtonVariant } from "./types";

// TODO update styles when design system is finalized
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

const Button: FC<ButtonProps> = ({
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

export default Button;
