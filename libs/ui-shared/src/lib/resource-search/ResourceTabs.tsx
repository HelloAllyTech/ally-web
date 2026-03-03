"use client";

import { FC, useMemo } from "react";

import { Tab, Tabs } from "@mui/material";

import { resourceTabsStyles } from "./constants";
import { Resource, SearchVariant } from "../../types";

/**
 * ResourceTabs component displays category tabs for filtering resources.
 * @component
 * @param {ResourceTabsProps} props - Props for ResourceTabs
 */
export interface ResourceTabsProps {
  resources: Resource[];
  categoryCountList?: { [key: string]: number };
  selectedCategory: string;
  setSelectedCategory: (category: string, isSearchTriggered?: boolean) => void;
  mode?: SearchVariant;
  allLabel?: string;
  translateCategory?: (category: string) => string;
}

const ResourceTabs: FC<ResourceTabsProps> = ({
  resources,
  selectedCategory,
  categoryCountList,
  setSelectedCategory,
  mode = SearchVariant.LIGHT,
  allLabel,
  translateCategory,
}) => {
  /**
   * Returns the count of resources in a category.
   * @param {string} category
   * @returns {number}
   */
  const getCategoryCount = (category: string) => {
    return resources?.filter(resource => resource.category === category).length;
  };

  /**
   * Returns the label for a category tab, including count.
   * @param {string} category
   * @returns {string}
   */
  const getCategoryLabel = (category: string) => {
    const label = allLabel || "All";
    const displayCategory = translateCategory ? translateCategory(category) : category;

    if (categoryCountList) {
      if (category === "All") {
        const totalCount = Object.values(categoryCountList).reduce((sum, count) => sum + count, 0);
        return `${label} (${totalCount})`;
      }
      return `${displayCategory} (${categoryCountList[category] || 0})`;
    }
    if (category === "All") {
      return `${label} (${resources?.length || 0})`;
    }
    return `${displayCategory} (${getCategoryCount(category) || 0})`;
  };

  const categoryList = useMemo(() => {
    if (categoryCountList) {
      return ["All", ...Object.keys(categoryCountList)];
    }
    return ["All"];
  }, [categoryCountList]);

  return (
    <div className="relative w-full">
      <div
        className="overflow-x-auto"
        style={{
          scrollbarWidth: "none" /* Firefox */,
          msOverflowStyle: "none" /* Internet Explorer 10+ */,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <Tabs
          className={`w-full border-b-[0.5px] min-w-max ${resourceTabsStyles[mode].tabs}`}
          value={selectedCategory}
          onChange={(_, value) => setSelectedCategory(value)}
          sx={{
            "& .MuiTabs-indicator": {
              backgroundColor: resourceTabsStyles[mode].indicator,
              height: "2px",
            },
            "& .MuiTabs-flexContainer": {
              gap: "8px",
            },
          }}
        >
          {categoryList.map(category => (
            <Tab
              key={category}
              value={category}
              label={getCategoryLabel(category)}
              className={`sm:text-[12px] md:text-[13px] lg:text-[16px] ${resourceTabsStyles[mode].tab}`}
              sx={{
                color: resourceTabsStyles[mode].tabColor,
                textTransform: "capitalize",
                fontFamily: "IBM Plex Serif",
                "&.Mui-selected": {
                  color: resourceTabsStyles[mode].selectedTabColor,
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
