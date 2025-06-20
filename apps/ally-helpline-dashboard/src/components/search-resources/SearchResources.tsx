import { FC, useState } from "react";
import { toast } from "sonner";

import { ResourceSearch, ResourceSearchResults } from "@ally-ui-mono/ui-shared";
import { Resource } from "@ally-ui-mono/ui-shared/types";
import { useGetSearchResultsMutation } from "@/api/search";

import { SearchResourcesProps } from "./types";

// TODO: Remove this once we have a real suggestions API
export const sampleSuggestions = ["Grounding techniques", "Boundaries", "Questions to encourage disclosure", "Things to say to help process grief"];


const SearchResources: FC<SearchResourcesProps> = ({ isInSidebar = false, showHeader = true, fullWidth = false, isSuggestionsRow = true }) => {
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
      showHeader={showHeader}
      fullWidth={fullWidth}
      searchQuery={searchQuery}
      isInSidebar={isInSidebar}
    />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <ResourceSearch onSearch={onInitialSearch} suggestions={sampleSuggestions} isSuggestionsRow={isSuggestionsRow} initialValue="" showHeader={showHeader} fullWidth={fullWidth} />
    </div>
  );
};

export default SearchResources;
