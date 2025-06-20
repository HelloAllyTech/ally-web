import { FC, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

import { ResourceSearch } from "@ally-ui-mono/ui-shared";
import { Resource } from "@ally-ui-mono/ui-shared/types";
import { useGetCategoriesQuery, useGetSearchResultsMutation } from "@/api/search";

import { SearchResourcesProps } from "./types";

const SearchResources: FC<SearchResourcesProps> = ({
  isInSidebar = false,
  showHeader = true,
  fullWidth = false,
}) => {
  const [_, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [hasMore, setHasMore] = useState(true);


  const [getSearchResults, { isLoading: isResourcesLoading }] = useGetSearchResultsMutation();
  const { data: categories } = useGetCategoriesQuery();

  const handleSearch = async (query: string) => {
    if (!isInSidebar) {
      setSearchParams({ q: query });
    }
    setSearchQuery(query);
    if (query) {
      try {
      const response = await getSearchResults({
        query,
        limit: 10,
      });
      if (response.data) {
        setResources(response.data.documents);
      } else{
        toast.error("Error fetching search results");
      }
      } catch {
        toast.error("Error fetching search results");
      }
    }
  };

  const fetchRemainingResources = async () => {
    console.log("hasMore", hasMore);
    if (isResourcesLoading || !hasMore) return;
    const response = await getSearchResults({
      query: searchQuery,
      limit: resources.length + 10,
    });
    if (response.data) {
      const newDocuments = response.data.documents;
      console.log("newDocuments", newDocuments?.length, resources?.length);
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
      categories={categories || []}
      isLoading={isResourcesLoading}
      onSearch={handleSearch}
      onInfiniteScroll={fetchRemainingResources}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      showHeader={showHeader}
      fullWidth={fullWidth}
      searchQuery={searchQuery}
      isSuggestionsRow={!isInSidebar}
    />
  )
};

export default SearchResources;
