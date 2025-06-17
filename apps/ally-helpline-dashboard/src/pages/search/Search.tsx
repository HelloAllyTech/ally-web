import { useState } from 'react';

import { ResourceSearchResults } from '@ally-ui-mono/ui-shared';

const Search = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  return <ResourceSearchResults selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />;
};

export default Search;
