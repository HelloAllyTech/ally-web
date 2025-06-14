import { FC, useState } from 'react';

import { Tab, Tabs } from '@mui/material';

import { ResourceSearchBar, ResourceCard, SearchHeader } from '../..';
import { categories, resources } from './constants';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';

export interface ResourceSearchResultsProps {}

const ResourceSearchResults: FC<ResourceSearchResultsProps> = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getResources = () => {
    if (selectedCategory === 'all') {
      return resources;
    }
    return resources.filter((resource) => resource.category === selectedCategory);
  };

  const getCategoryCount = (category: string) => {
    return resources.filter((resource) => resource.category === category).length;
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'all') {
      return `All (${resources.length})`;
    } else if (category === 'more') {
      return (
        <div className="flex items-center justify-center gap-2">
          <span>More</span>
          <PlayArrowRounded className="rotate-90 text-[#000] !w-4 !h-4" />
        </div>
      );
    }
    return `${category} (${getCategoryCount(category)})`;
  };

  const onTabClick = (category: string) => {
    if (category === 'more') {
      console.log('more');
      return;
    }
    setSelectedCategory(category);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-[60%] flex flex-col gap-4 items-center">
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <SearchHeader />
          <ResourceSearchBar />
        </div>
        <Tabs className="w-full border-b border-[#D4D4D4]">
          {categories.map((category) => (
            <Tab
              key={category}
              label={getCategoryLabel(category)}
              onClick={() => onTabClick(category)}
              className={`capitalize ${selectedCategory === category ? '!text-[#0D0D0D] !font-medium' : '!text-[#525252]'}`}
              sx={{
                '&.MuiButtonBase-root .MuiTouchRipple-root': {
                  borderBottom:
                    selectedCategory === category && category !== 'more'
                      ? '2px solid #0D0D0D'
                      : 'none',
                },
              }}
            />
          ))}
        </Tabs>
        <div className="h-[calc(100vh-400px)] overflow-y-auto flex flex-col gap-4 items-center mt-4">
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
