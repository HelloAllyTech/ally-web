"use client";
import { FC, useRef, useCallback, useEffect } from "react";
import { CircularProgress } from "@mui/material";

import {
  ResourceSearchBar,
  ResourceCard,
  SearchHeader,
  InfiniteScroll,
  SuggestionsContainer,
  SkeletonLoader,
} from "../..";
import { Resource } from "../../types";
import ResourceTabs from "./ResourceTabs";
import { sampleSuggestions } from "./constants";

/**
 * ResourceSearch component provides a search interface for resources with category filtering, infinite scroll, and suggestions.
 * @component
 * @param {ResourceSearchProps} props - Props for ResourceSearch
 */
export interface ResourceSearchProps {
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  onInfiniteScroll?: () => void;
  onSearch?: (searchTerm: string) => void;
  resources?: Resource[];
  isLoading?: boolean;
  searchQuery?: string;
  showHeader?: boolean;
  fullWidth?: boolean;
  showHeaderDescriptionInMobile?: boolean;
  isSuggestionsCenter?: boolean;
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
  isSuggestionsCenter = false,
  isSuggestionsRow = false,
  categoryCountList,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Scrolls the container to the top
   */
  const scrollToTop = useCallback(() => {
    if (scrollContainerRef.current) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Small delay to ensure content has rendered
      timeoutRef.current = setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        timeoutRef.current = null;
      }, 50);
    }
  }, []);

  useEffect(() => {
    // Scroll to top when search query changes
    if (searchQuery) {
      scrollToTop();
    }
  }, [searchQuery, scrollToTop]);

  useEffect(() => {
    // Scroll to top when category changes
    if (selectedCategory) {
      scrollToTop();
    }
  }, [selectedCategory, scrollToTop]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles search action and calls onSearch prop if provided.
   * @param {string} searchTerm - The search term entered by the user
   */
  const handleSearch = (searchTerm: string) => {
    if (onSearch && searchTerm) {
      onSearch(searchTerm);
    }
  };

  /**
   * Renders the UI when no results are found.
   * @returns {JSX.Element}
   */
  const renderNoResults = () => {
    return (
      <div className="w-full text-left px-4 pt-[10px]">
        <span className="text-[#ADADAD]">{`No results found for "${searchQuery}"`}</span>
        <SuggestionsContainer
          suggestions={sampleSuggestions}
          isRow={false}
          isCenter={isSuggestionsCenter}
          onSelect={handleSearch}
        />
      </div>
    );
  };

  /**
   * Renders the main results body based on search and loading state.
   * @returns {React.ReactNode | null}
   */
  const renderResultsBody = (): React.ReactNode | null => {
    if (!searchQuery) {
      return (
        <SuggestionsContainer
          isRow={isSuggestionsRow}
          isCenter={isSuggestionsCenter}
          suggestions={sampleSuggestions}
          onSelect={handleSearch}
        />
      );
    }
    if (isLoading && (!resources || resources.length === 0)) {
      return <SkeletonLoader />;
    } else if (resources && resources.length > 0) {
      return (
        <>
          <div className="w-[calc(100%-32px)] sm:w-full ml-[16px] mr-[16px]">
            {categoryCountList && (
              <ResourceTabs
                resources={resources}
                selectedCategory={selectedCategory ?? "All"}
                categoryCountList={categoryCountList}
                setSelectedCategory={onCategoryChange}
              />
            )}
          </div>
          <div
            ref={scrollContainerRef}
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            className={
              "w-full pt-[14px] h-[90vh] overflow-y-auto flex flex-col gap-2 md:gap-4 items-center px-4 md:px-0 pb-[300px]"
            }
          >
            {resources && resources.length > 0 ? (
              <InfiniteScroll
                onInfiniteScroll={onInfiniteScroll || (() => {})}
                isLoading={isLoading || false}
              >
                {resources.map(resource => (
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
