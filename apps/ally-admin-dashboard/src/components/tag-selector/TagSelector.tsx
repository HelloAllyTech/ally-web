import { useEffect, useRef, useState } from "react";

import { useCreateTriggerWarningMutation, useGetTriggerWarningsQuery } from "@api";
import { Close, Plus, Search } from "@assets";
import { en } from "@constants";
import { useClickOutside } from "@hooks";
import { triggerWarning } from "@types";

interface TagsDropdown {
  updateTriggerWarnings: (tags: triggerWarning[]) => void;
  triggerWarnings: triggerWarning[];
  label: string;
}

const DEFAULT_LIMIT = 20;

export const TagSelector: React.FC<TagsDropdown> = ({
  triggerWarnings = [],
  updateTriggerWarnings,
  label,
}) => {
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [allOptions, setAllOptions] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: options, isFetching } = useGetTriggerWarningsQuery({
    name: searchQuery,
    offset: (page - 1) * DEFAULT_LIMIT,
    limit: DEFAULT_LIMIT,
  });
  const [createTriggerWarning] = useCreateTriggerWarningMutation();

  // Reset when search query changes
  useEffect(() => {
    setPage(1);
    setAllOptions([]);
    setHasMore(true);
  }, [searchQuery]);

  // Load options data
  useEffect(() => {
    if (!options) return;

    const selectedIds = new Set(triggerWarnings.map(tag => tag.id));

    if (page === 1) {
      const filtered = options.filter(option => !selectedIds.has(option.id));

      setAllOptions(filtered);
    } else {
      setAllOptions(prev => {
        const existingIds = new Set(prev.map(opt => opt?.id));
        const newOptions = options.filter(option => !existingIds.has(option.id));
        const updatedList = [...prev, ...newOptions]?.filter(option => !selectedIds.has(option.id));
        return updatedList;
      });
    }
    setHasMore(options.length === DEFAULT_LIMIT);
  }, [options, page, triggerWarnings]);

  // Intersection Observer callback
  const handleObserver = (entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  // Setup Intersection Observer
  useEffect(() => {
    const element = loadingRef.current;
    const option = {
      root: scrollContainerRef.current,
      rootMargin: "20px",
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver(handleObserver, option);

    if (element) {
      observerRef.current.observe(element);
    }

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
    };
  }, [handleObserver, openDropdown]);

  const addTagButton = () => {
    setOpenDropdown(prev => !prev);
  };

  const closeDropdown = () => {
    setSearchQuery("");
    setOpenDropdown(false);
  };

  useClickOutside(dropdownRef, closeDropdown);

  const removeTag = (tagToRemove: triggerWarning) => {
    updateTriggerWarnings(triggerWarnings.filter(tag => tag !== tagToRemove));
  };

  const selectTag = (selectedTag: any) => {
    if (selectedTag && !triggerWarnings.includes(selectedTag)) {
      updateTriggerWarnings([...triggerWarnings, selectedTag]);
    }
    closeDropdown();
  };

  const createNewTag = async () => {
    const newTag = searchQuery.trim();
    const existingTag = triggerWarnings.map(tag => tag.name.toLowerCase());
    if (existingTag.includes(newTag.toLowerCase())) {
      closeDropdown();
      return;
    }
    const newTrigger = await createTriggerWarning({ name: newTag });
    selectTag(newTrigger?.data);
  };

  const renderDropdown = () => (
    <div className="absolute left-0 top-full mt-1 bg-white border rounded-md shadow-lg z-50 w-[300px]">
      <div className="relative p-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-typography-800" />
        <input
          type="text"
          placeholder="Search or create"
          className="w-full !outline-none border rounded-md py-1 px-5 text-base"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          maxLength={50}
        />
      </div>

      <div className="overflow-auto max-h-[240px] custom-scrollbar" ref={scrollContainerRef}>
        {allOptions.length > 0 &&
          allOptions.map(option => (
            <div
              key={option?.id}
              className="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-100 whitespace-nowrap  flex"
              onClick={() => selectTag(option)}
            >
              <span className="truncate">{option?.name}</span>
            </div>
          ))}

        {/* Loading indicator */}
        {hasMore && (
          <div ref={loadingRef} className="px-3 py-2 text-sm text-center">
            {isFetching ? en.common.loading : ""}
          </div>
        )}

        {/* CREATE OPTION */}
        {searchQuery.trim() !== "" &&
          !allOptions.some(option => option?.name === searchQuery.trim()) && (
            <div
              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
              onClick={createNewTag}
            >
              <span className="font-bold pr-2">{en.simulation.create}</span>
              <span>"{searchQuery}"</span>
            </div>
          )}
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="tags" className="text-typography-900 text-base cursor-pointer">
        {label}
      </label>

      <div className="flex flex-wrap gap-2">
        {triggerWarnings?.map(tag => (
          <div
            key={tag?.id}
            className="flex items-center px-2 bg-white border border-border-light rounded-full text-typography-900"
          >
            <span>{tag?.name}</span>
            <button type="button" className="cursor-pointer ml-2" onClick={() => removeTag(tag)}>
              <Close />
            </button>
          </div>
        ))}

        <div className="relative" ref={dropdownRef}>
          {triggerWarnings?.length < 5 && (
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
