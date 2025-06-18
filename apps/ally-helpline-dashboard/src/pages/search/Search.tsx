import { useState } from 'react';
import { toast } from 'sonner';

import { ResourceSearchResults, SuggestionsContainer } from '@ally-ui-mono/ui-shared';
import { useGetSearchResultsMutation } from '@/api/search';
import { Resource } from '@ally-ui-mono/ui-shared/types';

// TODO: Remove this once we have a real suggestions API
export const sampleSuggestions = ['Grounding techniques', 'Boundaries', 'Questions to encourage disclosure', 'Things to say to help process grief'];

const Search = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);

  const [getSearchResults, { isLoading: isResourcesLoading }] = useGetSearchResultsMutation();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query?.length > 0) {
      try {
      const response = await getSearchResults({
        query,
        limit: 10,
      });
      if (response.data) {
        setResources(response.data.documents);
      } else {
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

  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch(suggestion);
  }


  return (
    <div>
      <ResourceSearchResults
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onSearch={handleSearch}
        resources={resources}
        onInfiniteScroll={fetchRemainingResources}
        isLoading={isResourcesLoading}
        searchQuery={searchQuery}
      />
      {!searchQuery && <SuggestionsContainer suggestions={sampleSuggestions} onSelect={handleSuggestionSelect} />}
    </div>
  );
};

export default Search;
