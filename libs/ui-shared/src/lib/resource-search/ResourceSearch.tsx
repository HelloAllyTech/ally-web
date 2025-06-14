import { FC } from 'react';

import { ResourceSearchBar, SearchHeader } from '../..';

export interface ResourceSearchProps {
  onSearch: () => void;
}

const ResourceSearch: FC<ResourceSearchProps> = ({ onSearch }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-[60%] flex flex-col gap-4 items-center">
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <SearchHeader />
          <ResourceSearchBar />
        </div>
        <button
          onClick={onSearch}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default ResourceSearch;
