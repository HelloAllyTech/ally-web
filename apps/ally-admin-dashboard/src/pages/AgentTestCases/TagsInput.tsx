import { FC, useRef, useState } from "react";

import { Plus } from "@assets";
import { TagList } from "@components";
import { useClickOutside } from "@hooks";

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  /** Existing tags surfaced as autocomplete suggestions. */
  suggestions?: string[];
  label?: string;
  maxTags?: number;
}

/**
 * A self-contained free-create tags input (chips + search/create dropdown).
 * Unlike SimpleTagSelector it draws suggestions from the `suggestions` prop
 * rather than the session-event tag catalog, so it stays scoped to whatever
 * feature embeds it.
 */
export const TagsInput: FC<TagsInputProps> = ({
  tags,
  onChange,
  suggestions = [],
  label,
  maxTags = Infinity,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setSearch("");
    setOpen(false);
  };
  useClickOutside(dropdownRef, close);

  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (!tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
      onChange([...tags, tag]);
    }
    close();
  };

  const filteredSuggestions = suggestions.filter(
    s =>
      s.toLowerCase().includes(search.toLowerCase()) &&
      !tags.some(t => t.toLowerCase() === s.toLowerCase()),
  );

  const showCreate =
    search.trim() !== "" && !tags.some(t => t.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-typography-900 text-base">{label}</label>}
      <TagList
        tags={tags}
        onRemove={removeTag}
        tagClassName="bg-white text-base"
        className="gap-2 items-center"
      >
        <div className="relative" ref={dropdownRef}>
          {tags.length < maxTags && (
            <button
              type="button"
              className="flex items-center gap-1 border border-border-light rounded-full px-3 py-0.5 text-sm text-typography-700 hover:text-typography-900"
              onClick={() => setOpen(prev => !prev)}
            >
              <Plus />
              Add
            </button>
          )}
          {open && (
            <div className="absolute left-0 top-full mt-1 bg-white border rounded-md shadow-lg z-50 w-[280px]">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search or create"
                  className="w-full !outline-none border rounded-md py-1 px-3 text-base"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && search.trim()) {
                      e.preventDefault();
                      addTag(search);
                    }
                  }}
                  maxLength={50}
                  autoFocus
                />
              </div>
              <div className="overflow-auto max-h-[240px] custom-scrollbar pb-1">
                {filteredSuggestions.map(s => (
                  <div
                    key={s}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                    onClick={() => addTag(s)}
                  >
                    <span className="truncate">{s}</span>
                  </div>
                ))}
                {showCreate && (
                  <div
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                    onClick={() => addTag(search)}
                  >
                    <span className="font-bold pr-2">Create</span>
                    <span>"{search.trim()}"</span>
                  </div>
                )}
                {!showCreate && filteredSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Type to search or create a tag
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </TagList>
    </div>
  );
};
