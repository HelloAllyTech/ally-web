import { forwardRef } from "react";

import { ButtonProps, ButtonVariant } from "./types";

// TODO: update styles when design system is finalized
const getButtonStyles = (variant: ButtonProps["variant"]) => {
  switch (variant) {
    case ButtonVariant.DESTRUCTIVE:
      return "bg-destructive text-white hover:bg-destructive/90 disabled:bg-destructive/50";
    case ButtonVariant.SECONDARY:
      return "border border-secondary hover:bg-accent hover:text-typography-900 disabled:bg-accent/50 text-typography-900 font-tertiary";
    case ButtonVariant.ICON:
      return "bg-transparent border-none hover:bg-transparent disabled:bg-transparent !p-2 !h-fit";
    case ButtonVariant.TEXT:
      return "bg-transparent border-none hover:bg-transparent disabled:bg-transparent";
    case ButtonVariant.PRIMARY:
    default:
      return "text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary/50 font-tertiary";
  }
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant = "primary",
  fullWidth,
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={`h-10 flex items-center justify-center gap-2 py-2 px-4 whitespace-nowrap text-sm font-medium rounded-[100px]
        transition-transform duration-150 ease-out hover:-translate-y-[1px] disabled:hover:translate-y-0
        disabled:cursor-default disabled:opacity-50 ${getButtonStyles(variant)} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
