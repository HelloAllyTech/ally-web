import React from "react";
import SearchIcon from "@mui/icons-material/Search";

/**
 * Props for SuggestionsContainer component.
 */
interface SuggestionsContainerProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isRow?: boolean;
  isCenter?: boolean;
}

/**
 * SuggestionsContainer displays a list of suggestion chips for quick search or action.
 * @component
 * @param {SuggestionsContainerProps} props - Props for SuggestionsContainer
 */
const SuggestionsContainer: React.FC<SuggestionsContainerProps> = ({
  suggestions,
  onSelect,
  isRow = true,
  isCenter = false,
}) => (
  <div
    className={`flex ${isCenter ? "justify-center" : ""} w-full mt-[10%] sm:mt-[5%] px-4 md:px-0`}
  >
    <div className="text-left min-w-[200px] font-['IBM_Plex_Serif']">
      <div className="text-[16px] font-normal leading-[100%] tracking-[0] mb-4">Try:</div>
      <div
        className={`flex w-[100%] ${
          isRow
            ? "sm:flex-wrap sm:flex-row sm:items-center  flex-col items-start"
            : "flex-col items-start"
        } gap-4 justify-center`}
      >
        {suggestions?.map(chip => (
          <button
            key={chip}
            className="w-auto flex items-center border border-gray-200 rounded-xl px-[10px] py-[6px] bg-gray-50 text-[14px] text-gray-400 font-normal leading-[100%] tracking-[0] cursor-pointer justify-start hover:bg-gray-100 transition font-ibmplexserif whitespace-nowrap"
            onClick={() => onSelect(chip)}
          >
            <SearchIcon className="mr-2 w-4 h-4 text-gray-400 shrink-0" />
            {chip}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default SuggestionsContainer;
