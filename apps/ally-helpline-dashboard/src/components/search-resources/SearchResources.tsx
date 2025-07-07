import { FC, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { ResourceSearch } from "@ally-ui-mono/ui-shared";
import { Resource } from "@ally-ui-mono/ui-shared/types";
import { useGetSearchResultsMutation } from "@/api/search";

import { SearchResourcesProps } from "./types";

const PAGE_SIZE = 10;

const SearchResources: FC<SearchResourcesProps> = ({
  isInSidebar = false,
  showHeader = true,
  fullWidth = false,
}) => {
  const [, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [categoryCountList, setCategoryCountList] = useState<{ [key: string]: number }>({});
  const [hasMore, setHasMore] = useState(true);

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
      // TODO: Will be removed in future when a seperate api is introduced
      await triggerSearch(query);
      if (category) triggerSearch(query, category);
    };

    initializeSearchWithQueryParams();
  }, []);

  const [getSearchResults, { isLoading: isResourcesLoading }] = useGetSearchResultsMutation();

  const triggerSearch = async (query: string, category?: string) => {
    let filters = undefined;
    if (category && category !== "All") {
      filters = { category };
    }
    const response = await getSearchResults({
      query,
      limit: PAGE_SIZE,
      filters,
    });
    setHasMore(response.data?.total > resources.length + response.data?.documents?.length);
    if (response.data) {
      setResources(response.data.documents);
      if (!(category && category !== "All")) {
        // If there is a category, it means the query is filtered and wont return category list
        setCategoryCountList(response.data.categories);
      }
    } else {
      toast.error("Error fetching search results");
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
    if (response.data) {
      const newDocuments = response.data.documents;
      setResources(prevResources => [...prevResources, ...newDocuments]);
      setHasMore(newDocuments.length === PAGE_SIZE);
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
      categoryCountList={categoryCountList}
    />
  );
};

export default SearchResources;
