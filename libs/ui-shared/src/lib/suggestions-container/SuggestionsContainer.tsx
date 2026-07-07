import { FC } from "react";

import { Search } from "@carbon/icons-react";

import { suggestionsStyles } from "./constants";
import { SearchVariant } from "../../types";

/**
 * Props for SuggestionsContainer component.
 */
interface SuggestionsContainerProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isRow?: boolean;
  isCenter?: boolean;
  mode?: SearchVariant;
  suggestionsTitle?: string;
}

/**
 * SuggestionsContainer displays a list of suggestion chips for quick search or action.
 * @component
 * @param {SuggestionsContainerProps} props - Props for SuggestionsContainer
 */
const SuggestionsContainer: FC<SuggestionsContainerProps> = ({
  suggestions,
  onSelect,
  isRow = true,
  isCenter = false,
  mode = SearchVariant.LIGHT,
  suggestionsTitle,
}) => (
  <div
    data-testid="suggestions-container"
    className={`flex ${isCenter ? "justify-center" : ""} w-full mt-[10%] sm:mt-[5%] px-4 md:px-0`}
  >
    <div className="text-left min-w-[200px] font-['IBM_Plex_Serif']">
      <div
        className={`leading-[100%] tracking-[0] mb-4 ${suggestionsStyles[mode].header}`}
        data-testid="suggestions-header"
      >
        {suggestionsTitle || "Try:"}
      </div>
      <div
        data-testid="suggestions-list"
        className={`flex w-[100%] ${
          isRow
            ? "sm:flex-wrap sm:flex-row sm:items-center flex-col items-start"
            : "flex-col items-start"
        } gap-4 justify-center`}
      >
        {suggestions?.map(chip => (
          <button
            key={chip}
            data-testid={`suggestion-chip-${chip.toLowerCase().replace(/\s+/g, "-")}`}
            className={`w-auto flex items-center border-[0.5px] rounded-xl px-[10px] py-[6px] leading-[100%] tracking-[0] cursor-pointer hover:bg-gray-100 transition whitespace-nowrap ${suggestionsStyles[mode].suggestionButton}`}
            onClick={() => onSelect(chip)}
          >
            <Search
              size={16}
              className={`mr-2 w-4 h-4 shrink-0 ${suggestionsStyles[mode].searchIcon}`}
              data-testid="suggestion-chip-icon"
            />
            {chip}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default SuggestionsContainer;
