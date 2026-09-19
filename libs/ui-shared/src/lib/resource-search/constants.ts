import { SearchVariant } from "../../types";

export const sampleSuggestions = [
  "Violence safety plan",
  "Suicide assesment",
  "Survivors of abuse",
  "Client’s resistance",
];

export const resourceTabsStyles = {
  [SearchVariant.DARK]: {
    tabs: "border-[#5A5F6A]",
    indicator: "#faf9f5",
    tab: "text-[12px]",
    tabColor: "#BFBFBF",
    selectedTabColor: "#BFBFBF",
  },
  [SearchVariant.LIGHT]: {
    tabs: "border-[#D4D4D4]",
    indicator: "#0D0D0D",
    tab: "text-[14px]",
    tabColor: "#565045",
    selectedTabColor: "#0D0D0D",
  },
};
