import { SearchVariant } from "../../types";

export const resourceCardStyles = {
  [SearchVariant.DARK]: {
    card: "bg-[#1E2025]",
    title: "text-[#FFFFFF]",
    description: "text-[#FFFFFF]",
    showMoreLess: "text-[#FFFFFF]",
  },
  [SearchVariant.LIGHT]: {
    card: "bg-[#FFFFFF] border border-[#DADCE1]",
    title: "text-[#000000]",
    description: "text-[#525252]",
    showMoreLess: "text-[#525252] hover:text-[#000]",
  },
};
