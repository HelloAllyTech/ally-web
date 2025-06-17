import { FC, SetStateAction, Dispatch } from 'react';

import { ResourceSearchBar, ResourceCard, SearchHeader } from '../..';
import { resources } from './constants';
import ResourceTabs from './ResourceTabs';

export interface ResourceSearchResultsProps {
  selectedCategory: string;
  setSelectedCategory: Dispatch<SetStateAction<string>>;
}

const ResourceSearchResults: FC<ResourceSearchResultsProps> = ({ selectedCategory, setSelectedCategory }) => {
  const getResources = () => {
    if (selectedCategory === 'all') {
      return resources;
    }
    return resources.filter(
      (resource) => resource.category === selectedCategory
    );
  };



  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-[60%] flex flex-col gap-4 items-center">
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <SearchHeader />
          <ResourceSearchBar />
        </div>
        <ResourceTabs
          resources={resources}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <div className="h-[calc(100vh-290px)] overflow-y-auto flex flex-col gap-4 items-center mt-4">
          {getResources().map((resource) => (
            <ResourceCard
              key={resource.id}
              title={resource.title}
              description={resource.description}
              category={resource.category}
              tags={resource.tags}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourceSearchResults;
