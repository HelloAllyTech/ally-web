import { FC, useEffect, useRef, useState } from "react";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useGetCharactersQuery } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { Permissions, en } from "@constants";
import { useClickOutside, useUser } from "@hooks";
import { CharacterData } from "@types";
import { hasPermissions } from "@utils";

import { hintClass, inputClass } from "./LandingFields";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

interface CharacterPickerProps {
  onPick: (character: CharacterData) => void;
}

/**
 * "Fill from Character Library": lists the Character Library (the same `GET /v1/scenario-characters`
 * the library page and the simulation form read) and hands back the one the author picks.
 *
 * Optional all the way down. It needs the view-character grant, and it stays hidden if the list
 * cannot be read: the persona is perfectly writable by hand, so a broken picker must not get in
 * the way of it. The list is only requested once the author opens the picker.
 */
export const CharacterPicker: FC<CharacterPickerProps> = ({ onPick }) => {
  const copy = en.courseLanding.hero.characterPicker;
  const { permissions } = useUser();
  const canView = hasPermissions(permissions, [Permissions.VIEW_CHARACTER_LIBRARY]);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useClickOutside(containerRef, () => setIsOpen(false));

  const { data, isLoading, isError } = useGetCharactersQuery(
    { limit: PAGE_SIZE, offset: 0, search: debouncedSearch },
    { skip: !canView || !isOpen },
  );

  if (!canView || isError) return null;

  const characters = data?.characters ?? [];

  return (
    <div ref={containerRef} className="flex flex-col gap-2" data-testid="character-picker">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={ButtonVariant.SECONDARY}
          className="!h-9 text-sm"
          onClick={() => setIsOpen(open => !open)}
          aria-expanded={isOpen}
        >
          {isOpen ? copy.close : copy.open}
        </Button>
        <span className={hintClass}>{copy.hint}</span>
      </div>

      {isOpen && (
        <div className="border border-border-light rounded-md p-2 flex flex-col gap-2 bg-white">
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchLabel}
            className={inputClass}
          />
          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <p className="px-2 py-3 text-sm text-typography-500">{copy.loading}</p>
            ) : characters.length === 0 ? (
              <p className="px-2 py-3 text-sm text-typography-500">{copy.empty}</p>
            ) : (
              <ul className="flex flex-col">
                {characters.map(character => (
                  <li key={character.id ?? character.name}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(character);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left hover:bg-secondary-50"
                    >
                      <span className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {character.coverImageUrl && (
                          <CustomImage
                            src={character.coverImageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm text-typography-900 truncate">
                          {character.age ? `${character.name}, ${character.age}` : character.name}
                        </span>
                        {character.profession && (
                          <span className="text-xs text-typography-500 truncate">
                            {character.profession}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
