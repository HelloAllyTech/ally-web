import React from "react";

import { ButtonProps } from "@components/types";
import { getButtonStyles } from "@utils";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`h-10 flex items-center justify-center gap-2 py-2 px-4 whitespace-nowrap text-base font-normal rounded-none
        transition-colors duration-150 ease-out
        focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500
        disabled:cursor-not-allowed disabled:opacity-50 ${getButtonStyles(variant)} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
