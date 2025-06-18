import React from 'react';
import SearchIcon from '@mui/icons-material/Search';

interface SuggestionsContainerProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

const SuggestionsContainer: React.FC<SuggestionsContainerProps> = ({ suggestions, onSelect }) => (
  <div className="flex justify-center w-full mt-[10%]">
    <div className="text-left min-w-[200px]">
      <div className="text-[14px] font-normal leading-[100%] tracking-[0] mb-4 font-ibmplexserif">Try:</div>
      <div className="flex flex-col gap-4 items-start">
        {suggestions?.map((chip) => (
          <button
            key={chip}
            className="w-auto flex items-center border border-gray-200 rounded-xl px-4 py-2 bg-gray-50 text-[14px] text-gray-400 font-normal leading-[100%] tracking-[0] cursor-pointer justify-start hover:bg-gray-100 transition font-ibmplexserif whitespace-nowrap"
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