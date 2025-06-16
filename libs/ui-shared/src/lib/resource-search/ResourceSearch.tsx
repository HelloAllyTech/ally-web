import { FC } from 'react';

import { ResourceSearchBar, SearchHeader } from '../..';

export interface ResourceSearchProps {
  onSearch: (searchTerm: string) => void;
}

const ResourceSearch: FC<ResourceSearchProps> = ({ onSearch }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-[60%] flex flex-col gap-4 items-center">
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <SearchHeader />
          <ResourceSearchBar onSearch={onSearch} />
        </div>
      </div>
    </div>
  );
};

export default ResourceSearch;
