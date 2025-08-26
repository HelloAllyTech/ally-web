import { SearchVariant } from "../../types";

export const searchBarStyles = {
  [SearchVariant.DARK]: {
    backgroundColor: "#1E2025",
    border: "0.5px solid #242529",
    placeholderColor: "#F8F8F8",
    color: "#FFF",
    searchIconColor: "#797C84",
    rootHeight: "40px",
    textFieldHeight: "40px",
    searchIcon: "[&_path]:fill-[#797C84]",
    clearIcon: "#FFFFFF",
    optionCard: "bg-[#1E2025] text-[#F8F8F8]",
  },
  [SearchVariant.LIGHT]: {
    backgroundColor: "#FFF",
    color: "#000",
    border: "0.5px solid #D6D7DB",
    rootHeight: { xs: "40px", sm: "56px" },
    textFieldHeight: { xs: "40px", sm: "56px" },
    placeholderColor: {},
    searchIcon: "",
    clearIcon: "#000000",
    optionCard: "bg-[#FFF] text-[#555]",
  },
};
