import { useState } from "react";

import { Close, Search } from "@assets";
import { en } from "@constants";

interface TagsDropdown {
  options: Array<{ value: string; label: string }>;
  formMethods?: any;
  label: string;
}
export const Tags: React.FC<TagsDropdown> = ({ options, label }) => {
  const [inputValue, setInputValue] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);

  const addTagButton = () => {
    setOpenDropdown(prev => !prev);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const selectTag = (selectedTag: string) => {
    const newTag = selectedTag.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    addTagButton();
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="tags" className="text-typography-900 cursor-pointer">
        {label}
      </label>

      <div className="flex flex-wrap gap-2">
        {tags?.map((tag, index) => (
          <div
            key={index}
            className="flex items-center px-2 bg-white border border-border-light rounded-full text-typography-900"
          >
            <span>{tag}</span>
            <button type="button" className="cursor-pointer ml-2" onClick={() => removeTag(tag)}>
              <Close />
            </button>
          </div>
        ))}

        <div className="relative">
          <div className="flex items-center border border-border-light rounded-full px-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Add"
              className="focus:outline-none flex-1 bg-white"
              disabled={true}
            />
            <button type="button" onClick={addTagButton} className="ml-2 text-primary text-sm">
              +
            </button>
          </div>

          {openDropdown && (
            <div className="absolute left-0 top-full mt-1  bg-white border rounded-md shadow-lg z-50">
              <div className="relative p-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-typography-800" />
                <input
                  type="text"
                  placeholder="Search or create"
                  className="w-full !outline-none border rounded-md py-1 px-5 text-base"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className=" overflow-auto max-h-[240px] custom-scrollbar">
                {options?.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-typography-800">
                    {en.common.noOptionsAvailable}
                  </div>
                ) : (
                  options.map(option => (
                    <div
                      key={option.value}
                      className="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-100"
                      onClick={() => selectTag(option.value)}
                    >
                      <div className="flex items-center justify-between text-md">
                        <span>{option.label}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
