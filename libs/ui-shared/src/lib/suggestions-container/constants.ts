import { SearchVariant } from "../../types";

export const suggestionsStyles = {
  [SearchVariant.DARK]: {
    header: "text-[14px] text-[#FFFFFF]",
    suggestionButton: "bg-[#1E2025] border-[#292C33] text-[#999999] text-[12px]",
    searchIcon: "text-[#797C84]",
  },
  [SearchVariant.LIGHT]: {
    header: "",
    suggestionButton: "bg-gray-50 border-gray-200 text-gray-400 text-[14px]",
    searchIcon: "text-gray-400",
  },
};
