import { useEffect, useRef, useState } from "react";

import { useCreateTriggerWarningMutation, useGetTriggerWarningsQuery } from "@api";
import { Close, Search } from "@assets";
import { useClickOutside } from "@hooks";

interface TagsDropdown {
  formMethods?: any;
  label: string;
  id: string;
}

const DEFAULT_LIMIT = 100;
const DEFAULT_OFFSET = 0;

export const TagSelector: React.FC<TagsDropdown> = ({ formMethods, label, id }) => {
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: options } = useGetTriggerWarningsQuery({
    name: searchQuery,
    offset: DEFAULT_OFFSET,
    limit: DEFAULT_LIMIT,
  });

  const [createTriggerWarning] = useCreateTriggerWarningMutation();

  useEffect(() => {
    if (formMethods) {
      formMethods.setValue(id, tags);
    }
  }, [tags, formMethods, id]);

  const addTagButton = () => {
    setOpenDropdown(prev => !prev);
  };

  const closeDropdown = () => {
    setSearchQuery("");
    setOpenDropdown(false);
  };

  useClickOutside(dropdownRef, closeDropdown);

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const selectTag = (selectedTag: string) => {
    const newTag = selectedTag.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    closeDropdown();
  };

  const createNewTag = async () => {
    const newTag = searchQuery.trim();
    await createTriggerWarning({ name: newTag });
    selectTag(newTag);
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

        <div className="relative" ref={dropdownRef}>
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
              +
            </button>
          </div>
          {openDropdown && (
            <div className="absolute left-0 top-full mt-1  bg-white border rounded-md shadow-lg z-50 w-[300px]">
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
                {options?.map(option => (
                  <div
                    key={option.id}
                    className="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-100 whitespace-nowrap overflow-auto custom-scrollbar flex"
                    onClick={() => selectTag(option.name)}
                  >
                    <span>{option.name}</span>
                  </div>
                ))}

                {/* CREATE OPTION */}
                {searchQuery.trim() !== "" &&
                  !options?.some(option => option.name === searchQuery.trim()) && (
                    <div
                      className="px-3 py-2 text-sm cursor-pointer  hover:bg-gray-100"
                      onClick={createNewTag}
                    >
                      <span className="font-bold pr-2">Create:</span>
                      <span>"{searchQuery}"</span>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
