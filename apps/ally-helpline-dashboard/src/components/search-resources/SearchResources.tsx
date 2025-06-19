import { FC, useState } from "react";
import { toast } from "sonner";

import { ResourceSearch, ResourceSearchResults, SuggestionsContainer } from "@ally-ui-mono/ui-shared";
import { Resource } from "@ally-ui-mono/ui-shared/types";
import { useGetSearchResultsMutation } from "@/api/search";

import { SearchResourcesProps } from "./types";

const SearchResources: FC<SearchResourcesProps> = ({ isInSidebar = false }) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);

  const [getSearchResults, { isLoading: isResourcesLoading }] = useGetSearchResultsMutation();

  const onInitialSearch = (searchTerm: string) => {
    setSearchQuery(searchTerm);
    handleSearch(searchTerm);
  };

  const handleSearch = async (query: string) => {
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
    const response = await getSearchResults({
      query: searchQuery,
      limit: resources.length + 10,
    });
    if (response.data) {
      setResources(response.data.documents);
    }
  };
   
  return searchQuery ? (
    <ResourceSearchResults
      resources={resources}
      isLoading={isResourcesLoading}
      onSearch={handleSearch}
      onInfiniteScroll={fetchRemainingResources}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      showHeader={false}
      fullWidth
      searchQuery={searchQuery}
      isInSidebar={isInSidebar}
    />
  ) : (
    <>
    <ResourceSearch onSearch={onInitialSearch} initialValue="" showHeader={false} fullWidth />
    </>
  );
};

export default SearchResources;
