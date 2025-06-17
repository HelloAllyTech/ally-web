import { useState } from 'react';

import { ResourceSearchResults } from '@ally-ui-mono/ui-shared';
import { useGetSearchResultsMutation } from '@/api/search';

const Search = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [getSearchResults, { data, isLoading }] = useGetSearchResultsMutation();

  const handleSearch = (query: string) => {
    console.log(query, selectedCategory);
    if (query) {
      getSearchResults({
        query,
        limit: 10,
        // filters: {
        //   category: selectedCategory,
        // }
      });
    }
  };

  return (
    <ResourceSearchResults
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      onSearch={handleSearch}
    />
  );
};

export default Search;
