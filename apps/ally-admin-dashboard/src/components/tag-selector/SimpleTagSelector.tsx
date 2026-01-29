import { useState, useRef } from "react";

import { Close, Plus } from "@assets";
import { useClickOutside } from "@hooks";

interface SimpleTagSelectorProps {
  tags: string[];
  updateTags: (tags: string[]) => void;
  label: string;
  maxTags?: number;
}

/**
 * SimpleTagSelector - A tag selector that works with string arrays
 * Provides the same UX as TagSelector but without API integration
 */
export const SimpleTagSelector: React.FC<SimpleTagSelectorProps> = ({
  tags = [],
  updateTags,
  label,
  maxTags = Infinity,
}) => {
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get all unique tags from existing data for suggestions
  const [allTags] = useState<string[]>([
    // You can populate this from a context or local storage
    // For now, it will show only the create option
  ]);

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
        {/* Show filtered suggestions */}
        {filteredSuggestions.length > 0 &&
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
        {searchQuery.trim() !== "" &&
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
        {filteredSuggestions.length === 0 && searchQuery.trim() === "" && (
          <div className="px-3 py-2 text-sm text-gray-500">Type to create a new tag</div>
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

      <div className="flex flex-wrap gap-2">
        {tags?.map((tag, index) => (
          <div
            key={index}
            className="flex items-center px-2 bg-white text-base border border-border-light rounded-full text-typography-900"
          >
            <span>{tag}</span>
            <button type="button" className="cursor-pointer ml-2" onClick={() => removeTag(tag)}>
              <Close />
            </button>
          </div>
        ))}

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
      </div>
    </div>
  );
};
