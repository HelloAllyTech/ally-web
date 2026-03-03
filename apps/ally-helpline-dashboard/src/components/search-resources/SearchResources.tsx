import { FC, useEffect, useState, useRef } from "react";

import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ResourceSearch } from "@ally-ui-mono/ui-shared";
import { Resource, SearchVariant } from "@ally-ui-mono/ui-shared/types";
import { useGetSearchResultsMutation } from "@api";

import { SearchResourcesProps } from "./types";

const PAGE_SIZE = 10;

const SearchResources: FC<SearchResourcesProps> = ({
  isInSidebar = false,
  showHeader = true,
  fullWidth = false,
}) => {
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [categoryCountList, setCategoryCountList] = useState<{ [key: string]: number }>({});
  const [hasMore, setHasMore] = useState<boolean>(true);
  const lastRequestId = useRef<number>(0);
  const currentRequestId = useRef<number>(0);

  useEffect(() => {
    const initializeSearchWithQueryParams = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get("q");
      const category = urlParams.get("category");
      if (!query && !category) {
        return;
      }
      setSearchQuery(query);
      setSelectedCategory(category || "All");
      // To get the category count list
      await triggerSearch(query);
      if (category) triggerSearch(query, category);
    };

    initializeSearchWithQueryParams();
  }, []);

  const [getSearchResults, { isLoading: isResourcesLoading }] = useGetSearchResultsMutation();

  const triggerSearch = async (query: string, category?: string) => {
    const requestId = ++currentRequestId.current;

    let filters = undefined;
    if (category && category !== "All") {
      filters = { category };
    }
    const response = await getSearchResults({
      query,
      limit: PAGE_SIZE,
      filters,
    });
    setHasMore(response.data?.total > response.data?.documents?.length);

    // Only process the response if it's from the most recent request
    if (requestId > lastRequestId.current) {
      lastRequestId.current = requestId;
      if (response.data) {
        setResources(response.data.documents);
        if (!(category && category !== "All")) {
          // If there is a category, it means the query is filtered and wont return category list
          setCategoryCountList(response.data.categories);
        }
      } else {
        toast.error(t("search.error"));
      }
    }
  };

  const onSearch = async (query: string) => {
    if (!isInSidebar) {
      setSearchParams({ q: query });
    }
    setSearchQuery(query);
    if (query) {
      triggerSearch(query);
    }
    setSelectedCategory("All");
  };

  const onCategoryChange = async (category: string) => {
    if (!isInSidebar) {
      if (category === "All") {
        setSearchParams({ q: searchQuery });
      } else {
        setSearchParams({ q: searchQuery, category });
      }
    }
    setSelectedCategory(category);
    triggerSearch(searchQuery, category);
  };

  const fetchRemainingResources = async () => {
    if (isResourcesLoading || !hasMore) return;

    const requestId = ++currentRequestId.current;
    let filters = undefined;
    if (selectedCategory && selectedCategory !== "All") {
      filters = { category: selectedCategory };
    }
    const response = await getSearchResults({
      query: searchQuery,
      limit: PAGE_SIZE,
      filters,
      excludedIds: resources.map(resource => resource.id),
    });

    // Only process the response if it's from the most recent request
    if (requestId > lastRequestId.current) {
      lastRequestId.current = requestId;
      if (response.data) {
        const newDocuments = response.data.documents;
        setResources(prevResources => {
          // Check to ensure no duplicates when combining with previous resources
          const combinedResources = [...prevResources, ...newDocuments];
          return combinedResources.filter(
            (resource, index, self) => index === self.findIndex(r => r.id === resource.id),
          );
        });
        setHasMore(response.data?.total > response.data?.documents?.length);
      }
    }
  };

  return (
    <ResourceSearch
      resources={resources}
      isLoading={isResourcesLoading}
      onSearch={onSearch}
      onInfiniteScroll={fetchRemainingResources}
      selectedCategory={selectedCategory}
      onCategoryChange={onCategoryChange}
      showHeader={showHeader}
      fullWidth={fullWidth}
      searchQuery={searchQuery}
      isSuggestionsCenter={isInSidebar}
      isSuggestionsRow={!isInSidebar}
      mode={isInSidebar ? SearchVariant.DARK : SearchVariant.LIGHT}
      categoryCountList={categoryCountList}
    />
  );
};

export default SearchResources;
