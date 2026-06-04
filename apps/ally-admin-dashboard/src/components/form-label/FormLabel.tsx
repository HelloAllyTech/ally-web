import { FC, ReactNode } from "react";

interface FormLabelProps {
  children: ReactNode;
  isMandatory?: boolean;
  htmlFor?: string;
  className?: string;
}

export const FormLabel: FC<FormLabelProps> = ({
  children,
  isMandatory = false,
  htmlFor,
  className = "",
}) => (
  <label
    htmlFor={htmlFor}
    className={`text-typography-900 text-base flex items-center gap-1 ${className}`}
  >
    {children}
    {isMandatory && <span className="text-destructive-500">*</span>}
  </label>
);
