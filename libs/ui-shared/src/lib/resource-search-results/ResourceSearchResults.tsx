'use client';
import { FC } from 'react';

import { ResourceSearchBar, ResourceCard, SearchHeader, InfiniteScroll, SuggestionsContainer } from '../..';
import { Resource } from '../../types';
import ResourceTabs from './ResourceTabs';
import { CircularProgress } from '@mui/material';
import { sampleSuggestions } from './constants';

export interface ResourceSearchResultsProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  onInfiniteScroll: () => void;
  onSearch: (searchTerm: string) => void;
  resources: Resource[];
  isLoading: boolean;
  searchQuery?: string;
  showHeader?: boolean;
  fullWidth?: boolean;
  isInSidebar?: boolean;
  showHeaderDescriptionInMobile?: boolean;
}

const ResourceSearchResults: FC<ResourceSearchResultsProps> = ({
  selectedCategory,
  setSelectedCategory,
  onInfiniteScroll,
  onSearch,
  resources,
  isLoading,
  searchQuery,
  showHeader = true,
  fullWidth = false,
  showHeaderDescriptionInMobile = true,
  isInSidebar = false,
}) => {
  const getResources = () => {
    if (selectedCategory === 'all') {
      return resources;
    }
    return resources.filter(
      (resource) => resource.category === selectedCategory
    );
  };

  const renderResultsBody = (): React.ReactNode | null => {
    if (resources?.length === 0 && isLoading) {
      return <div className="w-full h-full flex flex-col items-center pt-[20px]"><CircularProgress /></div>
    } else if (resources?.length > 0) {
      return (
        <>
          <div className="w-[calc(100%-32px)] sm:w-full ml-[16px] mr-[16px]">
            <ResourceTabs
              resources={resources}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
          </div>
          <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className={`w-full pt-[14px] h-[90vh] overflow-y-auto flex flex-col gap-2 md:gap-4 items-center px-4 md:px-0 pb-[300px]`}>
            {getResources()?.length > 0 ? (
              <InfiniteScroll onInfiniteScroll={onInfiniteScroll} isLoading={isLoading}>
                {getResources()?.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    title={resource.heading}
                    description={resource.content}
                    category={resource.category}
                    tags={resource.tags}
                  />
                ))}
              </InfiniteScroll>
            ) : (
              <div className="text-left px-4 pt-[10px]">
                <span className='text-[#ADADAD]'>{`No results found for "${searchQuery}"`}</span>
                <SuggestionsContainer suggestions={sampleSuggestions} isRow={false} onSelect={onSearch} />
              </div>
            )}
            
          </div>
        </>
      )
    }
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className={`${fullWidth ? 'w-full' : 'w-full'} min-w-[300px] flex flex-col items-center`}>
        <div className="w-full flex flex-col gap-2 items-center justify-center px-4 mb-2 md:px-0">
          {showHeader && <SearchHeader showDescriptionInMobile={showHeaderDescriptionInMobile} />}
          <ResourceSearchBar onSearch={onSearch} initialValue={searchQuery ?? ''} />
        </div>
        {renderResultsBody()}
      </div>
    </div>
  );
};

export default ResourceSearchResults;
