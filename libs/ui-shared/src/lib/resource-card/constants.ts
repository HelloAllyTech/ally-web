import { SearchVariant } from "../../types";

export const resourceCardStyles = {
  [SearchVariant.DARK]: {
    card: "bg-[#1E2025]",
    title: "text-[#faf9f5]",
    description: "text-[#faf9f5]",
    showMoreLess: "text-[#faf9f5]",
  },
  [SearchVariant.LIGHT]: {
    card: "bg-[#faf9f5] border border-[#DADCE1]",
    title: "text-[#29261f]",
    description: "text-[#565045]",
    showMoreLess: "text-[#565045] hover:text-[#000]",
  },
};
