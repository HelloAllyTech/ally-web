import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createPortal } from "react-dom";
import { toast } from "sonner";

import { useCreateFillerTagMutation, useGetFillerTagsQuery } from "@api";
import { Close, Plus, Search } from "@assets";
import { en } from "@constants";
import { useCreatePortal } from "@hooks";

interface Tag {
  id: string;
  name: string;
}

interface FillerTagPickerProps {
  tags: Tag[];
  updateTags: (tags: Tag[]) => void;
  maxTags?: number;
  /** Names to offer in addition to the global catalogue (e.g. AI-generated or recently used). */
  supplementalTagNames?: string[];
}

const DEFAULT_LIMIT = 20;

/** Search / create control for reusable filler words (backed by `/v1/learn/filler-tags`). */
export const FillerTagPicker: React.FC<FillerTagPickerProps> = ({
  tags,
  updateTags,
  maxTags = 5,
  supplementalTagNames = [],
}) => {
  const [openDropdown, setOpenDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [allOptions, setAllOptions] = useState<{ id: string; name: string }[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: options, isFetching } = useGetFillerTagsQuery({
    name: searchQuery,
    offset: (page - 1) * DEFAULT_LIMIT,
    limit: DEFAULT_LIMIT,
  });

  const [createFillerTag] = useCreateFillerTagMutation();

  const hasMoreRef = useRef(hasMore);
  const isFetchingRef = useRef(isFetching);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);

  const selectedNamesLower = useMemo(
    () => new Set((tags ?? []).map(t => t.name.trim().toLowerCase()).filter(Boolean)),
    [tags],
  );

  useEffect(() => {
    setPage(1);
    setAllOptions([]);
    setHasMore(true);
  }, [searchQuery]);

  useEffect(() => {
    if (!options?.data) return;

    const keepOption = (option: { id: string; name: string }) =>
      !selectedNamesLower.has(option.name.trim().toLowerCase());

    if (page === 1) {
      const filtered = options.data.filter(keepOption);
      setAllOptions(filtered);
      setHasMore(options.data.length === DEFAULT_LIMIT);
    } else {
      setAllOptions(prev => {
        const existingIds = new Set(prev.map(opt => opt?.id));
        const newOptions = options.data.filter(
          option => !existingIds.has(option.id) && keepOption(option),
        );
        return [...prev, ...newOptions];
      });
      setHasMore(options.data.length === DEFAULT_LIMIT);
    }
  }, [options, page, selectedNamesLower]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target?.isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
      setPage(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    if (!openDropdown || !hasMore) return undefined;
    const element = loadingRef.current;
    const root = scrollContainerRef.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(handleObserver, {
      root,
      rootMargin: "20px",
      threshold: 0,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [openDropdown, hasMore, handleObserver]);

  const supplementalOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const apiNamesLower = new Set(allOptions.map(o => o.name.trim().toLowerCase()));
    return supplementalTagNames
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .filter(n => !selectedNamesLower.has(n.toLowerCase()))
      .filter(n => !apiNamesLower.has(n.toLowerCase()))
      .filter(n => (q === "" ? true : n.toLowerCase().includes(q)))
      .map(n => ({ id: `local-${n.toLowerCase()}`, name: n }));
  }, [supplementalTagNames, searchQuery, allOptions, selectedNamesLower]);

  const listToRender = useMemo(
    () => [...supplementalOptions, ...allOptions],
    [supplementalOptions, allOptions],
  );

  const closeDropdown = useCallback(() => {
    setSearchQuery("");
    setOpenDropdown(false);
  }, []);

  useEffect(() => {
    if (!openDropdown) return undefined;
    const handleMouseDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (dropdownRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      closeDropdown();
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [openDropdown, closeDropdown]);

  const removeTag = (tagToRemove: Tag) => {
    updateTags(tags.filter(tag => tag !== tagToRemove));
  };

  const selectTag = (selectedTag: Tag | undefined) => {
    if (!selectedTag) {
      closeDropdown();
      return;
    }
    if (tags.length >= maxTags) {
      closeDropdown();
      return;
    }
    if (!tags.some(t => t.name.trim().toLowerCase() === selectedTag.name.trim().toLowerCase())) {
      updateTags([...tags, selectedTag]);
    }
    closeDropdown();
  };

  const addTagButton = () => {
    setOpenDropdown(prev => !prev);
  };

  // Pass a realistic dropdown height so the picker opens BELOW the trigger
  // instead of flipping ~280px up (the default) and overlapping unrelated
  // fields when the trigger sits low in the viewport. The actual dropdown
  // (search + a few options) is short; the list itself scrolls (max-h-240).
  const dropdownPosition = useCreatePortal(triggerRef, openDropdown, {
    dropdownHeight: 200,
  });

  const createNewTag = async () => {
    const newTag = searchQuery.trim();
    const existingTag = tags.map(tag => tag.name.toLowerCase());
    if (existingTag.includes(newTag.toLowerCase())) {
      closeDropdown();
      return;
    }
    if (tags.length >= maxTags) {
      closeDropdown();
      return;
    }
    try {
      const created = await createFillerTag({ name: newTag }).unwrap();
      selectTag({
        id: created.id,
        name: created.name,
      });
    } catch {
      toast.error(en.errors.failedToCreateFillerTag);
      closeDropdown();
    }
  };

  const renderDropdown = () =>
    dropdownPosition != null &&
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
          />
        </div>

        <div className="overflow-auto max-h-[240px] custom-scrollbar" ref={scrollContainerRef}>
          {listToRender.length > 0 &&
            listToRender.map(option => (
              <div
                key={`${option.id}-${option.name}`}
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
            !listToRender.some(
              option => option?.name.toLowerCase() === searchQuery.trim().toLowerCase(),
            ) && (
              <div
                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                onClick={createNewTag}
              >
                <span className="font-bold pr-2">{en.simulation.create}</span>
                <span>&quot;{searchQuery}&quot;</span>
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
          className="group/tag flex items-center px-2 py-1 bg-white text-sm border border-border-light rounded-md text-typography-900"
        >
          <span>{tag?.name}</span>
          <button
            type="button"
            className="cursor-pointer ml-2 opacity-0 group-hover/tag:opacity-100"
            onClick={() => removeTag(tag)}
          >
            <Close />
          </button>
        </div>
      ))}
      <div className="relative">
        {tags?.length < maxTags && (
          <div
            ref={triggerRef}
            className={`flex items-center border border-border-light ${tags.length > 0 ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
            onClick={addTagButton}
          >
            <button type="button" className="text-primary text-sm p-1">
              <Plus />
            </button>
          </div>
        )}
        {openDropdown ? renderDropdown() : null}
      </div>
    </div>
  );
};
