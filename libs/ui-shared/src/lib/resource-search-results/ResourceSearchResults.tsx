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

  const getCategoryCount = (key: string) => {
    return resources.filter((resource) => resource.category === key).length;
  };

  const getCategoryLabel = (key: string, label: string) => {
    if (key === 'all') {
      return `All (${resources.length})`;
    } else if (key === 'more') {
      return (
        <div className="flex items-center justify-center gap-2">
          <span>More</span>
          <PlayArrowRounded className="rotate-90 text-[#000] !w-4 !h-4" />
        </div>
      );
    }
    return `${label} (${getCategoryCount(key)})`;
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
          <ResourceSearchBar onSearch={() => {}} />
        </div>
        <Tabs 
          className="w-full border-b border-[#D4D4D4]"
          value={selectedCategory}
          onChange={(_, value) => onTabClick(value)}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#0D0D0D',
              height: '2px'
            }
          }}
        >
          {categories.map(({ key, label }) => (
            <Tab
              key={key}
              value={key}
              label={getCategoryLabel(key, label)}
              sx={{
                color: '#525252',
                textTransform: 'capitalize',
                fontFamily: 'IBM Plex Serif',
                '&.Mui-selected': {
                  color: '#0D0D0D',
                  fontWeight: 500
                }
              }}
            />
          ))}
        </Tabs>
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
