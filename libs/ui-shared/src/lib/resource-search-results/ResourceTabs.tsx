'use client';

import { FC, useState, useRef } from 'react';
import { Tab, Tabs } from '@mui/material';

import { Dropdown } from '../..';
import { categories, moreOptions } from './constants';
import { PlayArrowRounded } from '@mui/icons-material';

export interface ResourceTabsProps {
  resources: any[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const ResourceTabs: FC<ResourceTabsProps> = ({
  resources,
  selectedCategory,
  setSelectedCategory,
}) => {
  const moreTabRef = useRef<HTMLDivElement>(null);
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
    return resources?.filter((resource) => resource.category === key).length;
  };

  const getCategoryLabel = (key: string, label: string) => {
    if (key === 'all') {
      return `All (${resources?.length || 0})`;
    } else if (key === 'more') {
      return (
        <div ref={moreTabRef} className="flex items-center justify-center gap-2">
          <span>More</span>
          <PlayArrowRounded className="rotate-90 text-[#000] !w-4 !h-4" />
        </div>
      );
    }
    return `${label} (${getCategoryCount(key) || 0})`;
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
    setSelectedCategory(value);
    setIsMoreOpen(false);
  };

  const getDropdownStyle = () => {
    if (!moreTabRef.current) return {};
    const tabElement = moreTabRef.current.closest('[role="tab"]');
    if (!tabElement) return {};
    const containerElement = moreTabRef.current.closest('.relative');
    if (!containerElement) return {};
    
    const tabRect = tabElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    return { left: `${tabRect.left - containerRect.left}px` };
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
            className="text-[14px] sm:text-[16px]"
            sx={{
              color: '#525252',
              textTransform: 'capitalize',
              fontFamily: 'IBM Plex Serif',
              flex: 1,
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
          className="top-10"
          style={getDropdownStyle()}
        />
      )}
    </div>
  );
};

export default ResourceTabs;
