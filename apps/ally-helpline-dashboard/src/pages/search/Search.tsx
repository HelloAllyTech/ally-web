import { useState } from 'react';

import { ResourceSearchResults } from '@ally-ui-mono/ui-shared';
import { useGetSearchResultsMutation } from '@/api/search';
import { Resource } from '@ally-ui-mono/ui-shared/types';

const Search = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);

  const [getSearchResults, { isLoading: isResourcesLoading }] = useGetSearchResultsMutation();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query) {
      const response = await getSearchResults({
        query,
        limit: 10,
      });
      if (response.data) {
        setResources(response.data.documents);
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

  return (
    <ResourceSearchResults
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      onSearch={handleSearch}
      resources={resources}
      onInfiniteScroll={fetchRemainingResources}
      isLoading={isResourcesLoading}
    />
  );
};

export default Search;
