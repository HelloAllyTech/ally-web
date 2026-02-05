import { useState, useRef, useEffect } from "react";

import { Plus } from "@assets";
import { TagList } from "../tag-list";
import { useClickOutside } from "@hooks";
import { useGetSessionEventTagsQuery } from "@api";

interface SimpleTagSelectorProps {
  tags: string[];
  updateTags: (tags: string[]) => void;
  label: string;
  maxTags?: number;
}

/**
 * SimpleTagSelector - A tag selector that works with string arrays
 * Integrates with the API to fetch existing tags and supports search
 */
export const SimpleTagSelector: React.FC<SimpleTagSelectorProps> = ({
  tags = [],
  updateTags,
  label,
  maxTags = Infinity,
}) => {
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch tags from API with debounced search
  const { data: tagsData, isLoading } = useGetSessionEventTagsQuery(
    debouncedSearch ? { search: debouncedSearch } : undefined,
    {
      skip: !openDropdown, // Only fetch when dropdown is open
    },
  );

  const allTags = tagsData?.data || [];

  const addTagButton = () => {
    setOpenDropdown(prev => !prev);
  };

  const closeDropdown = () => {
    setSearchQuery("");
    setOpenDropdown(false);
  };

  useClickOutside(dropdownRef, closeDropdown);

  const removeTag = (tagToRemove: string) => {
    updateTags(tags.filter(tag => tag !== tagToRemove));
  };

  const selectTag = (selectedTag: string) => {
    if (selectedTag && !tags.includes(selectedTag)) {
      updateTags([...tags, selectedTag]);
    }
    closeDropdown();
  };

  const createNewTag = () => {
    const newTag = searchQuery.trim();
    if (!newTag) return;

    const existingTag = tags.map(tag => tag.toLowerCase());
    if (existingTag.includes(newTag.toLowerCase())) {
      closeDropdown();
      return;
    }
    selectTag(newTag);
  };

  // Filter suggestions based on search query and exclude already selected tags
  const filteredSuggestions = allTags.filter(
    tag => tag.toLowerCase().includes(searchQuery.toLowerCase()) && !tags.includes(tag),
  );

  const renderDropdown = () => (
    <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-50 w-[300px]">
      <div className="relative p-2">
        <input
          type="text"
          placeholder="Search or create"
          className="w-full !outline-none border rounded-md py-1 px-3 text-base"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && searchQuery.trim()) {
              e.preventDefault();
              createNewTag();
            }
          }}
          maxLength={50}
          autoFocus
        />
      </div>

      <div className="overflow-auto max-h-[240px] custom-scrollbar">
        {/* Loading state */}
        {isLoading && <div className="px-3 py-2 text-sm text-gray-500">Loading tags...</div>}

        {/* Show filtered suggestions */}
        {!isLoading &&
          filteredSuggestions.length > 0 &&
          filteredSuggestions.map((tag, index) => (
            <div
              key={index}
              className="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-100 whitespace-nowrap flex"
              onClick={() => selectTag(tag)}
            >
              <span className="truncate">{tag}</span>
            </div>
          ))}

        {/* CREATE OPTION */}
        {!isLoading &&
          searchQuery.trim() !== "" &&
          !filteredSuggestions.includes(searchQuery.trim()) &&
          !tags.includes(searchQuery.trim()) && (
            <div
              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
              onClick={createNewTag}
            >
              <span className="font-bold pr-2">Create</span>
              <span>"{searchQuery}"</span>
            </div>
          )}

        {/* Empty state */}
        {!isLoading && filteredSuggestions.length === 0 && searchQuery.trim() === "" && (
          <div className="px-3 py-2 text-sm text-gray-500">Type to search or create a new tag</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor="tags" className="text-typography-900 text-base cursor-pointer">
          {label}
        </label>
      )}

      <TagList tags={tags} onRemove={removeTag} tagClassName="bg-white text-base" className="gap-2">
        <div className="relative" ref={dropdownRef}>
          {tags?.length < maxTags && (
            <div
              className="flex items-center border border-border-light rounded-full px-2 w-[70px]"
              onClick={addTagButton}
            >
              <input
                type="text"
                placeholder="Add"
                className="focus:outline-none flex-1 bg-white cursor-pointer max-w-[40px]"
                readOnly
              />
              <button type="button" className="mr-2 text-primary text-sm">
                <Plus />
              </button>
            </div>
          )}
          {openDropdown && renderDropdown()}
        </div>
      </TagList>
    </div>
  );
};
