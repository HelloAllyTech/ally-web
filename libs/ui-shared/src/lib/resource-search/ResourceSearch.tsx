'use client';

import { FC } from 'react';

import { ResourceSearchBar, SearchHeader, SuggestionsContainer } from '../..';

// TODO: Remove this once we have a real suggestions API
export const sampleSuggestions = ['Grounding techniques', 'Boundaries', 'Questions to encourage disclosure', 'Things to say to help process grief'];


export interface ResourceSearchProps {
  initialValue?: string;
  onSearch: (searchTerm: string) => void;
  showHeader?: boolean;
  fullWidth?: boolean;
  suggestions?: string[];
  isSuggestionsRow?: boolean;
}

const ResourceSearch: FC<ResourceSearchProps> = ({ onSearch, initialValue = '', showHeader = true, fullWidth = false, suggestions = [], isSuggestionsRow = true }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className={`${fullWidth ? 'w-full' : 'w-[90%]'} w-[90%] flex flex-col gap-4 items-center`}>
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          {showHeader && <SearchHeader />}
          <ResourceSearchBar initialValue={initialValue} onSearch={onSearch} suggestions={suggestions} />
          {!initialValue && <SuggestionsContainer isRow={isSuggestionsRow} suggestions={sampleSuggestions} onSelect={onSearch} />}
        </div>
      </div>
    </div>
  );
};

export default ResourceSearch;
