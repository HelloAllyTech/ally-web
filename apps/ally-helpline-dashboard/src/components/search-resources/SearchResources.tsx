import { FC, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { ResourceSearch } from "@ally-ui-mono/ui-shared";
import { Resource } from "@ally-ui-mono/ui-shared/types";
import { useGetSearchResultsMutation } from "@/api/search";

import { SearchResourcesProps } from "./types";

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
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    const category = urlParams.get("category");
    if (!query && !category) {
      return;
    }
    setSearchQuery(query);
    setSelectedCategory(category || "All");
    triggerSearch(query, category);
  }, []);

  const [getSearchResults, { isLoading: isResourcesLoading }] = useGetSearchResultsMutation();

  const triggerSearch = async (query: string, category?: string) => {
    let filters = undefined;
    if (category && category !== "All") {
      filters = { category };
    }
    const response = await getSearchResults({
      query,
      limit: 10,
      filters,
    });
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

  const handleSearch = async (query: string) => {
    if (!isInSidebar) {
      setSearchParams({ q: query });
    }
    setSearchQuery(query);
    if (query) {
      triggerSearch(query);
    }
  };

  const handleCategoryChange = async (category: string, isSearchTriggered: boolean = true) => {
    if (!isInSidebar) {
      if (category === "All") {
        setSearchParams({ q: searchQuery });
      } else {
        setSearchParams({ q: searchQuery, category });
      }
    }
    setSelectedCategory(category);
    if (isSearchTriggered) {
      triggerSearch(searchQuery, category);
    }
  };

  const fetchRemainingResources = async () => {
    if (isResourcesLoading || !hasMore) return;
    const response = await getSearchResults({
      query: searchQuery,
      limit: resources.length + 10,
    });
    if (response.data) {
      const newDocuments = response.data.documents;
      setCategoryCountList(response.data.categories);
      if (newDocuments.length > resources.length) {
        setResources(newDocuments);
      } else {
        setHasMore(false);
      }
    }
  };

  return (
    <ResourceSearch
      resources={resources}
      isLoading={isResourcesLoading}
      onSearch={handleSearch}
      onInfiniteScroll={fetchRemainingResources}
      selectedCategory={selectedCategory}
      onCategoryChange={handleCategoryChange}
      showHeader={showHeader}
      fullWidth={fullWidth}
      searchQuery={searchQuery}
      isSuggestionsRow={!isInSidebar}
      categoryCountList={categoryCountList}
    />
  );
};

export default SearchResources;
