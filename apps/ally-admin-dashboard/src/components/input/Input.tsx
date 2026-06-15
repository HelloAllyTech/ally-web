import * as React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`flex h-10 w-[80px] rounded-none border-0 border-b border-border-dark bg-secondary-50 px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-typography-600 focus:outline-none focus-visible:border-b-2 focus-visible:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50 md:text-base  ${className ?? ""}`}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
