import { SearchVariant } from "../../types";

export const skeletonLoaderStyles = {
  [SearchVariant.DARK]: {
    card: "bg-[#1E2025]",
    tab: "bg-gray-700",
    text: "bg-gray-700",
  },
  [SearchVariant.LIGHT]: {
    card: "bg-white",
    tab: "bg-gray-200",
    text: "bg-gray-200",
  },
};
