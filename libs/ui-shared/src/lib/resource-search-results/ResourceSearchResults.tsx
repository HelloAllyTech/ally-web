'use client';
import { FC } from 'react';

import { ResourceSearchBar, ResourceCard, SearchHeader, InfiniteScroll } from '../..';
import { Resource } from '../../types';
import ResourceTabs from './ResourceTabs';

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

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className={`${fullWidth ? 'w-full' : 'w-[60%]'} flex flex-col gap-4 items-center`}>
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          {showHeader && <SearchHeader />}
          <ResourceSearchBar onSearch={onSearch} initialValue={searchQuery ?? ''} />
        </div>
        <ResourceTabs
          resources={resources}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <div className={`w-full ${isInSidebar ? 'h-[calc(100vh-500px)]' : 'h-[calc(100vh-290px)]'} overflow-y-auto flex flex-col gap-4 items-center mt-4`}>
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
        </div>
      </div>
    </div>
  );
};

export default ResourceSearchResults;
