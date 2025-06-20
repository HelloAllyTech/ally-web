'use client';

import { FC } from 'react';
import { Tab, Tabs } from '@mui/material';

import { Resource } from '../../types';

export interface ResourceTabsProps {
  categories: string[];
  resources: Resource[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const ResourceTabs: FC<ResourceTabsProps> = ({
  categories,
  resources,
  selectedCategory,
  setSelectedCategory,
}) => {
  const getCategoryCount = (category: string) => {
    return resources?.filter((resource) => resource.category === category).length;
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'All') {
      return `All (${resources?.length || 0})`;
    }
    return `${category} (${getCategoryCount(category) || 0})`;
  };
  
  return (
    <div className="relative w-full">
      <div 
        className="overflow-x-auto"
        style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none', /* Internet Explorer 10+ */
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Tabs
          className="w-full border-b border-[#D4D4D4] min-w-max"
          value={selectedCategory}
          onChange={(_, value) => setSelectedCategory(value)}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#0D0D0D',
              height: '2px',
            },
            '& .MuiTabs-flexContainer': {
              gap: '8px',
            },
          }}
        >
          {["All", ...categories].map((category) => (
            <Tab
              key={category}
              value={category}
              label={getCategoryLabel(category)}
              className="text-[14px] sm:text-[16px]"
              sx={{
                color: '#525252',
                textTransform: 'capitalize',
                fontFamily: 'IBM Plex Serif',
                '&.Mui-selected': {
                  color: '#0D0D0D',
                  fontWeight: 500,
                },
              }}
            />
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default ResourceTabs;
