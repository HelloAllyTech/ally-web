import { FC, useMemo, useRef, useState } from "react";

import { Close } from "@assets";
import { FormLabel } from "@components";
import { useClickOutside } from "@hooks";

interface ClusterFieldProps {
  // Cluster names this competency belongs to.
  values: string[];
  onChange: (next: string[]) => void;
  // Every cluster that already exists, offered as suggestions.
  options: string[];
}

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Cluster membership for one competency: chips for what it belongs to, and a
 * typeahead that both picks an existing cluster and creates a new one.
 *
 * A competency may sit in several clusters — an admin curating frameworks is
 * the one who knows how they overlap — so this is multi-value rather than a
 * single parent. Names are the wire format: the backend find-or-creates by
 * name, so typing a new one needs no separate "create cluster" step.
 */
export const ClusterField: FC<ClusterFieldProps> = ({ values, onChange, options }) => {
  const [draft, setDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setIsOpen(false));

  const add = (name: string) => {
    const trimmed = name.trim();
    setDraft("");
    setIsOpen(false);
    if (!trimmed) return;
    // Adding a cluster the competency is already in is a no-op rather than a
    // duplicate chip.
    if (values.some(value => sameName(value, trimmed))) return;
    onChange([...values, trimmed]);
  };

  const remove = (name: string) => onChange(values.filter(value => value !== name));

  const { suggestions, canCreate } = useMemo(() => {
    const available = options.filter(option => !values.some(value => sameName(value, option)));
    const query = draft.trim();
    const matches = query
      ? available.filter(option => option.toLowerCase().includes(query.toLowerCase()))
      : available;
    return {
      suggestions: matches,
      // Only offer creation for a name that doesn't already exist — otherwise
      // "Create X" would sit next to X and read as a second, separate cluster.
      canCreate: Boolean(query) && !options.some(option => sameName(option, query)),
    };
  }, [options, values, draft]);

  return (
    <div className="flex flex-col gap-2">
      <FormLabel>Clusters</FormLabel>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map(value => (
            <span
              key={value}
              className="flex items-center gap-1 rounded-full bg-primary-50 text-primary px-3 py-1 text-sm"
            >
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                aria-label={`Remove from ${value}`}
                className="text-primary hover:text-destructive-500"
              >
                <Close />
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={containerRef} className="relative">
        <input
          type="text"
          value={draft}
          onFocus={() => setIsOpen(true)}
          onChange={e => {
            setDraft(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              // Enter takes the single suggestion if there is exactly one and
              // the author hasn't typed a distinct new name.
              add(!canCreate && suggestions.length === 1 ? suggestions[0] : draft);
            }
            if (e.key === "Escape") setIsOpen(false);
          }}
          placeholder="Add to a cluster…"
          className="w-full rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
        />

        {isOpen && (suggestions.length > 0 || canCreate) && (
          <div className="absolute left-0 top-full mt-1 w-full max-h-[200px] overflow-auto rounded-md border border-border-light bg-white shadow-lg z-50 custom-scrollbar">
            {suggestions.map(option => (
              <div
                key={option}
                onClick={() => add(option)}
                className="cursor-pointer px-3 py-2 text-sm text-typography-900 hover:bg-background-secondary"
              >
                {option}
              </div>
            ))}
            {canCreate && (
              <div
                onClick={() => add(draft)}
                className="cursor-pointer px-3 py-2 text-sm text-primary hover:bg-background-secondary"
              >
                Create “{draft.trim()}”
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-typography-600">
        A cluster groups competencies so a simulation can select the whole framework at once. A
        competency can belong to more than one.
      </p>
    </div>
  );
};
