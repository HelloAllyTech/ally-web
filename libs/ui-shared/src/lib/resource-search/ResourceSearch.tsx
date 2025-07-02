"use client";
import { FC } from "react";
import { CircularProgress } from "@mui/material";

import {
  ResourceSearchBar,
  ResourceCard,
  SearchHeader,
  InfiniteScroll,
  SuggestionsContainer,
} from "../..";
import { Resource } from "../../types";
import ResourceTabs from "./ResourceTabs";
import { sampleSuggestions } from "./constants";
import SkeletonLoader from "../skeleton-loader/SkeletonLoader";

export interface ResourceSearchProps {
  selectedCategory?: string;
  onCategoryChange?: (category: string, isSearchTriggered?: boolean) => void;
  onInfiniteScroll?: () => void;
  onSearch?: (searchTerm: string) => void;
  resources?: Resource[];
  isLoading?: boolean;
  searchQuery?: string;
  showHeader?: boolean;
  fullWidth?: boolean;
  showHeaderDescriptionInMobile?: boolean;
  isSuggestionsRow?: boolean;
  categoryCountList?: { [key: string]: number };
}

const ResourceSearch: FC<ResourceSearchProps> = ({
  selectedCategory,
  onCategoryChange = () => {},
  onInfiniteScroll = () => {},
  onSearch,
  resources = [],
  isLoading = false,
  searchQuery,
  showHeader = true,
  fullWidth = false,
  showHeaderDescriptionInMobile = true,
  isSuggestionsRow = true,
  categoryCountList,
}) => {
  const getResources = () => {
    if (selectedCategory === "All") {
      return resources;
    }
    return resources?.filter(resource => resource.category === selectedCategory);
  };

  const handleSearch = (searchTerm: string) => {
    if (onSearch && onCategoryChange) {
      onCategoryChange("All", false);
      onSearch(searchTerm);
    }
  };

  const renderNoResults = () => {
    return (
      <div className="text-left px-4 pt-[10px]">
        <span className="text-[#ADADAD]">{`No results found for "${searchQuery}"`}</span>
        <SuggestionsContainer
          suggestions={sampleSuggestions}
          isRow={false}
          onSelect={handleSearch}
        />
      </div>
    );
  };

  const renderResultsBody = (): React.ReactNode | null => {
    if (!searchQuery) {
      return (
        <SuggestionsContainer
          isRow={isSuggestionsRow}
          suggestions={sampleSuggestions}
          onSelect={handleSearch}
        />
      );
    }
    if (isLoading && (!resources || resources.length === 0)) {
      return <SkeletonLoader />;
    } else if (resources && resources.length > 0) {
      const filteredResources = getResources();
      return (
        <>
          <div className="w-[calc(100%-32px)] sm:w-full ml-[16px] mr-[16px]">
            {selectedCategory && onCategoryChange && (
              <ResourceTabs
                resources={resources}
                selectedCategory={selectedCategory}
                categoryCountList={categoryCountList}
                setSelectedCategory={onCategoryChange}
              />
            )}
          </div>
          <div
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            className={
              "w-full pt-[14px] h-[90vh] overflow-y-auto flex flex-col gap-2 md:gap-4 items-center px-4 md:px-0 pb-[300px]"
            }
          >
            {filteredResources && filteredResources.length > 0 ? (
              <InfiniteScroll
                onInfiniteScroll={onInfiniteScroll || (() => {})}
                isLoading={isLoading || false}
              >
                {filteredResources.map(resource => (
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
              !isLoading && renderNoResults()
            )}
            {isLoading && <CircularProgress color="inherit" size={20} />}
          </div>
        </>
      );
    } else {
      return renderNoResults();
    }
  };

  return (
    <div
      className={`w-full h-full flex flex-col items-center ${
        !searchQuery && "justify-center"
      } overflow-y-hidden`}
    >
      <div
        className={`${
          fullWidth ? "w-full" : "w-full"
        } min-w-[300px] flex flex-col items-center overflow-hidden`}
      >
        <div className="w-full flex flex-col gap-2 items-center justify-center px-4 mb-2 md:px-0">
          {showHeader && <SearchHeader showDescriptionInMobile={showHeaderDescriptionInMobile} />}
          <ResourceSearchBar
            onSearch={handleSearch}
            suggestions={sampleSuggestions}
            initialValue={searchQuery ?? ""}
          />
        </div>
        {renderResultsBody()}
      </div>
    </div>
  );
};

export default ResourceSearch;
