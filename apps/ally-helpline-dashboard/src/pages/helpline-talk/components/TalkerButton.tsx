import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary-500 text-white hover:bg-primary-600 disabled:bg-primary-500/50",
  secondary:
    "border border-border-medium bg-white text-typography-900 hover:bg-background-secondary",
  ghost: "text-typography-900 hover:bg-background-secondary",
  danger: "bg-destructive-700 text-white hover:bg-destructive-800 disabled:bg-destructive-700/50",
};

export interface TalkerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

/**
 * The talker page's button: at least 44 px tall (touch target), a visible focus
 * ring, and no hover lift — this page is used one-handed on a phone, often by
 * someone in distress, and should feel calm rather than lively.
 */
export const TalkerButton = forwardRef<HTMLButtonElement, TalkerButtonProps>(
  ({ variant = "primary", fullWidth, className = "", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2 font-primary text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  ),
);

TalkerButton.displayName = "TalkerButton";
