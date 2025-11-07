import React from "react";

import { ButtonProps } from "@components/types";
import { getButtonStyles } from "@utils";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`h-10 flex items-center justify-center gap-2 py-2 px-4 whitespace-nowrap text-sm font-tertiary font-medium rounded-[100px]
        transition-transform duration-150 ease-out hover:-translate-y-[1px] disabled:hover:translate-y-0
        disabled:cursor-default disabled:opacity-50 ${getButtonStyles(variant)} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
