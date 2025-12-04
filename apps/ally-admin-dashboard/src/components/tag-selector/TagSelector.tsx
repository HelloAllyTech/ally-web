import { useEffect, useRef, useState } from "react";

import { useCreateTriggerWarningMutation, useGetTriggerWarningsQuery } from "@api";
import { Close, Search } from "@assets";
import { useClickOutside } from "@hooks";

interface TagsDropdown {
  formMethods?: any;
  label: string;
  id: string;
}

const DEFAULT_LIMIT = 2;

export const TagSelector: React.FC<TagsDropdown> = ({ formMethods, label, id }) => {
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
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
    if (options) {
      if (page === 1) {
        setAllOptions(options);
      } else {
        setAllOptions(prev => [...prev, ...options]);
      }

      // Update hasMore based on whether we got a full page
      if (options.length < DEFAULT_LIMIT) setHasMore(false);
    }
  }, [options, page]);

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

  // Sync with form methods
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

  const selectTag = selectedTag => {
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
        />
      </div>

      <div className="overflow-auto max-h-[240px] custom-scrollbar" ref={scrollContainerRef}>
        {allOptions.map(option => (
          <div
            key={option.id}
            className="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-100 whitespace-nowrap overflow-auto custom-scrollbar flex"
            onClick={() => selectTag(option.name)}
          >
            <span>{option.name}</span>
          </div>
        ))}

        {/* Loading indicator */}
        {hasMore && (
          <div ref={loadingRef} className="px-3 py-2 text-sm text-center">
            {isFetching ? "Loading..." : ""}
          </div>
        )}

        {/* No results */}
        {!isFetching && allOptions.length === 0 && searchQuery.trim() === "" && (
          <div className="px-3 py-2 text-sm text-gray-500 text-center">No tags available</div>
        )}

        {/* CREATE OPTION */}
        {searchQuery.trim() !== "" &&
          !allOptions.some(option => option.name === searchQuery.trim()) && (
            <div
              className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
              onClick={createNewTag}
            >
              <span className="font-bold pr-2">Create:</span>
              <span>"{searchQuery}"</span>
            </div>
          )}
      </div>
    </div>
  );

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

          {openDropdown && renderDropdown()}
        </div>
      </div>
    </div>
  );
};
