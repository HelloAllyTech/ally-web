import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { useGetTagsQuery } from "@api";
import { Close, Plus, Search } from "@assets";
import { en } from "@constants";
import { shortId } from "@src/components/notion-table";
interface Tag {
  id: string;
  name: string;
}

interface HelperTagProps {
  tags: Tag[];
  updateTags: (tags: Tag[]) => void;
}

const DEFAULT_LIMIT = 20;

export const HelperTag: React.FC<HelperTagProps> = ({ tags, updateTags }) => {
  const [openDropdown, setOpenDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [allOptions, setAllOptions] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: options, isFetching } = useGetTagsQuery({
    searchName: searchQuery,
    offset: (page - 1) * DEFAULT_LIMIT,
    limit: DEFAULT_LIMIT,
  });

  useEffect(() => {
    setPage(1);
    setAllOptions([]);
    setHasMore(true);
  }, [searchQuery]);

  useEffect(() => {
    if (!options) return;

    const selectedIds = new Set((tags ?? []).map(tag => tag.id));
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
      setHasMore(options.length === DEFAULT_LIMIT);
    }
  }, [options, page, tags]);

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

  const removeTag = (tagToRemove: Tag) => {
    updateTags(tags.filter(tag => tag !== tagToRemove));
  };

  const selectTag = (selectedTag: Tag) => {
    if (selectedTag && !tags.some(t => t.id === selectedTag.id)) {
      updateTags([...tags, selectedTag]);
    }
    closeDropdown();
  };

  const addTagButton = () => {
    setOpenDropdown(prev => !prev);
  };

  const closeDropdown = () => {
    setSearchQuery("");
    setOpenDropdown(false);
  };

  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current && openDropdown) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 300;
      const dropdownHeight = 280;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let top = rect.bottom + 4;
      let left = rect.left;

      if (top + dropdownHeight > viewportHeight - 8) {
        top = rect.top - dropdownHeight - 4;
      }
      if (left + dropdownWidth > viewportWidth - 8) {
        left = viewportWidth - dropdownWidth - 8;
      }
      if (left < 8) {
        left = 8;
      }

      setDropdownPosition({ top, left });
    } else {
      setDropdownPosition(null);
    }
  }, [openDropdown]);

  useLayoutEffect(() => {
    if (openDropdown) {
      updateDropdownPosition();
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [openDropdown, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        openDropdown &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const createNewTag = () => {
    const newTag = searchQuery.trim();
    const existingTag = tags.map(tag => tag.name.toLowerCase());
    if (existingTag.includes(newTag.toLowerCase())) {
      closeDropdown();
      return;
    }
    selectTag({ id: shortId(), name: newTag });
  };

  const renderDropdown = () =>
    dropdownPosition &&
    createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-white border rounded-md shadow-lg z-[9999] w-[300px]"
        style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
      >
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
                className="px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-gray-100 whitespace-nowrap flex"
                onClick={() => selectTag(option)}
              >
                <span className="truncate">{option?.name}</span>
              </div>
            ))}

          {hasMore && (
            <div ref={loadingRef} className="px-3 py-2 text-sm text-center">
              {isFetching ? en.common.loading : ""}
            </div>
          )}

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
      </div>,
      document.body,
    );

  return (
    <div className="flex flex-wrap gap-2 group items-center">
      {tags?.map(tag => (
        <div
          key={tag?.id}
          className="flex items-center px-2 bg-white text-sm border border-border-light rounded-full text-typography-900"
        >
          <span>{tag?.name}</span>
          <button type="button" className="cursor-pointer ml-2" onClick={() => removeTag(tag)}>
            <Close />
          </button>
        </div>
      ))}
      <div className="relative">
        <div
          ref={triggerRef}
          className="flex items-center border border-border-light opacity-0 group-hover:opacity-100"
          onClick={addTagButton}
        >
          <button type="button" className="text-primary text-sm">
            <Plus />
          </button>
        </div>
        {openDropdown && renderDropdown()}
      </div>
    </div>
  );
};
