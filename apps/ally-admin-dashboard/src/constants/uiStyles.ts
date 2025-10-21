import { ButtonVariant, ButtonProps } from "@components";

export const BUTTON_STYLES = {
  base: "flex text-[14px] justify-center items-center w-1/2 px-4 py-2 rounded-[50px] transition-colors font-medium",
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "text-gray-600 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  default: "border border-gray-400 text-gray-600 hover:bg-gray-50",
} as const;

export const getButtonStyles = (variant: ButtonProps["variant"]) => {
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

export const toolTipStyles = {
  tooltip: {
    sx: {
      backgroundColor: "#000",
      color: "white",
      borderRadius: "5px",
      maxWidth: "250px",
      whiteSpace: "normal",
    },
  },
};
