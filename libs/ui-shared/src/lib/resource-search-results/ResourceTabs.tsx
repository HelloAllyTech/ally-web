'use client';

import { Dispatch, FC, SetStateAction, useState } from 'react';
import { Tab, Tabs } from '@mui/material';

import { Dropdown } from '../..';
import { categories, moreOptions } from './constants';
import { PlayArrowRounded } from '@mui/icons-material';

export interface ResourceTabsProps {
  resources: any[];
  selectedCategory: string;
  setSelectedCategory: Dispatch<SetStateAction<string>>
}

const ResourceTabs: FC<ResourceTabsProps> = ({
  resources,
  selectedCategory,
  setSelectedCategory,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<string>('');

  const getCamelCase = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const getCategories = () => {
    if (newCategory) {
      return [...categories, { key: getCamelCase(newCategory), label: newCategory }, { key: 'more', label: 'More' }];
    }
    return [...categories, { key: 'more', label: 'More' }];
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
      setIsMoreOpen(!isMoreOpen);
      return;
    }
    setSelectedCategory(category);
  };

  const handleMoreChange = (value: string) => {
    setNewCategory(value);
    setIsMoreOpen(false);
  };
  
  return (
    <div className="relative w-full">
      <Tabs
        className="w-full border-b border-[#D4D4D4]"
        value={selectedCategory}
        onChange={(_, value) => onTabClick(value)}
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: '#0D0D0D',
            height: '2px',
          },
        }}
      >
        {getCategories().map(({ key, label }) => (
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
                fontWeight: 500,
              },
            }}
          />
        ))}
      </Tabs>
      {isMoreOpen && (
        <Dropdown
          options={moreOptions}
          handleChange={handleMoreChange}
          className="top-12 right-0"
        />
      )}
    </div>
  );
};

export default ResourceTabs;
