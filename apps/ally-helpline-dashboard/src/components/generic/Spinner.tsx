import React from "react";
import { cn } from "@/utils/tailwind";

interface SpinnerProps {
  className?: string;
  size?: "small" | "medium" | "large";
}

export const Spinner: React.FC<SpinnerProps> = ({
  className,
  size = "medium",
}) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-4 border-t-4 border-gray-200 border-t-blue-500",
        sizeClasses[size],
        className
      )}
    />
  );
};
