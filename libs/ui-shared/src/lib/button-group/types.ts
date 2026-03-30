import { ReactNode } from "react";

export type ButtonGroupProps = {
  buttonList: {
    action: (...args: any[]) => void;
    isActive?: boolean;
    isDisabled?: boolean;
    leftIcon?: ReactNode;
    show: boolean;
    text: string;
    className?: string;
  }[];
};
