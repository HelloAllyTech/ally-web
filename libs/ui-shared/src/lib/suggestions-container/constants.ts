import { SearchVariant } from "../../types";

export const suggestionsStyles = {
  [SearchVariant.DARK]: {
    header: "text-[14px] text-[#FFFFFF]",
    suggestionButton:
      "bg-[#1E2025] border-[#292C33] text-[#F8F8F8] text-[14px] hover:text-[#1A1A1A]",
    searchIcon: "text-[#797C84]",
  },
  [SearchVariant.LIGHT]: {
    header: "",
    suggestionButton: "bg-gray-50 border-gray-200 text-gray-400 text-[14px]",
    searchIcon: "text-gray-400",
  },
};
